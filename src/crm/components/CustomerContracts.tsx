import { useMemo, useState } from "react";
import { toast } from "sonner";
import { FileSignature, Link2, Send, ExternalLink, Plus, MessageSquare } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Chip, EmptyState } from "@/crm/components/Brand";
import { useTable } from "@/crm/lib/useSavvy";
import { money } from "@/crm/lib/pricing";
import { sendContractEmail, sendContractSms } from "@/lib/contracts.functions";

type Contract = {
  id: string;
  title: string;
  status: string;
  token: string;
  recipient_email: string | null;
  recipient_phone: string | null;
  sent_at: string | null;
  viewed_at: string | null;
  signed_at: string | null;
  signer_name: string | null;
  created_at: string;
};

type SmsLog = {
  id: string;
  contract_id: string;
  to_phone: string;
  status: string;
  error_message: string | null;
  created_at: string;
  updated_at: string;
};

type Template = { id: string; name: string; body: string; is_default: boolean };

type CustomerLite = {
  id: string;
  full_name: string;
  address: string | null;
  city: string | null;
  email: string | null;
  phone: string | null;
  monthly_price: number;
  service_level: string;
};

const STATUS_TONE: Record<string, "green" | "aqua" | "gold" | "orange" | "burgundy"> = {
  draft: "gold",
  sent: "aqua",
  viewed: "orange",
  signed: "green",
  declined: "burgundy",
  voided: "burgundy",
};

const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString() : null);

export default function CustomerContracts({ customer }: { customer: CustomerLite }) {
  const [creating, setCreating] = useState(false);
  const [templateId, setTemplateId] = useState<string>("");
  const [termMonths, setTermMonths] = useState(12);
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState<string | null>(null);
  const sendEmail = useServerFn(sendContractEmail);
  const sendSms = useServerFn(sendContractSms);
  const [smsFor, setSmsFor] = useState<string | null>(null);
  const [smsPhone, setSmsPhone] = useState("");

  const { rows: contracts, refetch } = useTable<Contract>(`contracts-${customer.id}`, async () => {
    const { data } = await supabase
      .from("ss_contracts")
      .select("id,title,status,token,recipient_email,recipient_phone,sent_at,viewed_at,signed_at,signer_name,created_at")
      .eq("customer_id", customer.id)
      .order("created_at", { ascending: false });
    return (data ?? []) as Contract[];
  });

  const { rows: templates } = useTable<Template>("contract-templates", async () => {
    const { data } = await supabase
      .from("ss_contract_templates")
      .select("id,name,body,is_default")
      .eq("is_active", true)
      .order("created_at");
    return (data ?? []) as Template[];
  });

  const { rows: smsLog, refetch: refetchSms } = useTable<SmsLog>(`contract-sms-${customer.id}`, async () => {
    const { data } = await supabase
      .from("ss_contract_sms")
      .select("id,contract_id,to_phone,status,error_message,created_at,updated_at")
      .order("created_at", { ascending: false });
    return (data ?? []) as SmsLog[];
  });

  const selectedTemplate = useMemo(
    () => templates.find((t) => t.id === templateId) ?? templates.find((t) => t.is_default) ?? templates[0],
    [templates, templateId],
  );

  const createContract = async () => {
    if (!selectedTemplate) {
      toast.error("No contract template available");
      return;
    }
    setBusy("create");
    const merged = selectedTemplate.body
      .replaceAll("{{customer_name}}", customer.full_name)
      .replaceAll("{{address}}", customer.address ?? "—")
      .replaceAll("{{city}}", customer.city ?? "—")
      .replaceAll("{{service_level}}", customer.service_level)
      .replaceAll("{{monthly_price}}", money(customer.monthly_price))
      .replaceAll("{{term_months}}", String(termMonths))
      .replaceAll(
        "{{start_date}}",
        new Date(`${startDate}T12:00:00`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
      );

    const { error } = await supabase.from("ss_contracts").insert({
      customer_id: customer.id,
      template_id: selectedTemplate.id,
      title: `${customer.full_name} — ${termMonths}-month service agreement`,
      body: merged,
      status: "draft",
      recipient_name: customer.full_name,
      recipient_email: customer.email,
      recipient_phone: customer.phone,
      merge_data: { term_months: termMonths, start_date: startDate, monthly_price: customer.monthly_price },
    });
    setBusy(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Contract created — send it when ready");
    setCreating(false);
    refetch();
  };

  const send = async (contract: Contract) => {
    if (!contract.recipient_email) {
      toast.error("Add an email address for this customer first");
      return;
    }
    setBusy(contract.id);
    try {
      await sendEmail({ data: { contractId: contract.id, origin: window.location.origin } });
      toast.success(`Contract emailed to ${contract.recipient_email}`);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send the contract");
    } finally {
      setBusy(null);
    }
  };

  const text = async (contract: Contract) => {
    const phone = smsPhone.trim();
    if (!phone) {
      toast.error("Enter a mobile number");
      return;
    }
    setBusy(contract.id);
    try {
      const res = await sendSms({ data: { contractId: contract.id, phone, origin: window.location.origin } });
      toast.success(`Signing link texted to ${res.to}`);
      setSmsFor(null);
      refetch();
      refetchSms();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send the text");
      refetchSms();
    } finally {
      setBusy(null);
    }
  };

  const copyLink = async (contract: Contract) => {
    await navigator.clipboard.writeText(`${window.location.origin}/sign/${contract.token}`);
    toast.success("Signing link copied");
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="ss-label flex items-center gap-1.5">
          <FileSignature size={13} /> Contracts &amp; e-sign
        </div>
        <button className="ss-btn" onClick={() => setCreating((v) => !v)}>
          <Plus size={13} /> New contract
        </button>
      </div>

      {creating && (
        <div className="ss-card space-y-3 p-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block">
              <span className="ss-label">Template</span>
              <select
                className="ss-input mt-1 w-full"
                value={selectedTemplate?.id ?? ""}
                onChange={(e) => setTemplateId(e.target.value)}
              >
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="ss-label">Term</span>
              <select
                className="ss-input mt-1 w-full"
                value={termMonths}
                onChange={(e) => setTermMonths(Number(e.target.value))}
              >
                <option value={3}>3 months</option>
                <option value={6}>6 months</option>
                <option value={12}>12 months</option>
              </select>
            </label>
            <label className="block">
              <span className="ss-label">Start date</span>
              <input
                type="date"
                className="ss-input mt-1 w-full"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </label>
          </div>
          <div className="text-[0.72rem] opacity-70">
            Pre-filled for {customer.full_name} · {customer.service_level} · {money(customer.monthly_price)}/mo
          </div>
          <button className="ss-btn" onClick={createContract} disabled={busy === "create"}>
            {busy === "create" ? "Creating…" : "Create contract"}
          </button>
        </div>
      )}

      {!contracts.length && !creating && (
        <EmptyState>No contracts yet — create one and send it for signature.</EmptyState>
      )}

      {contracts.map((k) => (
        <div key={k.id} className="ss-card p-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="text-[0.85rem] font-semibold">{k.title}</div>
              <div className="mt-0.5 text-[0.7rem] opacity-65">
                Created {fmt(k.created_at)}
                {k.sent_at && <> · Sent {fmt(k.sent_at)}</>}
                {k.viewed_at && <> · Opened {fmt(k.viewed_at)}</>}
                {k.signed_at && <> · Signed by {k.signer_name} on {fmt(k.signed_at)}</>}
              </div>
            </div>
            <Chip tone={STATUS_TONE[k.status] ?? "aqua"}>{k.status}</Chip>
          </div>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {k.status !== "signed" && k.status !== "voided" && (
              <button className="ss-btn" onClick={() => send(k)} disabled={busy === k.id}>
                <Send size={12} /> {busy === k.id ? "Sending…" : k.sent_at ? "Resend email" : "Send for signature"}
              </button>
            )}
            <button className="ss-btn ss-btn-ghost" onClick={() => copyLink(k)}>
              <Link2 size={12} /> Copy link
            </button>
            <a
              className="ss-btn ss-btn-ghost !no-underline"
              href={`/sign/${k.token}`}
              target="_blank"
              rel="noreferrer"
            >
              <ExternalLink size={12} /> {k.status === "signed" ? "View signed copy" : "Preview"}
            </a>
          </div>
        </div>
      ))}
    </div>
  );
}
