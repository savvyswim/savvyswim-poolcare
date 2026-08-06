import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Download, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Chip, EmptyState } from "@/crm/components/Brand";
import { money2 } from "@/crm/lib/pricing";
import {
  accountByCode,
  ageDays,
  downloadCsv,
  postLedger,
  todayIso,
  type FinanceSlice,
} from "@/crm/finance/shared";

type Line = {
  description: string;
  quantity: number;
  unit_price: number;
  /** Internal only — never shown to the customer. Drives tech commission. */
  is_upsell: boolean;
  /** Internal only — our cost for the line, used for job margin. */
  unit_cost: number;
};

type VisitOption = {
  id: string;
  scheduled_date: string;
  tech_id: string | null;
  payout_id: string | null;
};

/** Fires the invoice/receipt email. Best effort — never blocks the ledger write. */
async function emailFinanceDoc(body: {
  type: "invoice" | "receipt";
  invoiceId: string;
  paymentAmount?: number;
  method?: string;
}) {
  try {
    await supabase.functions.invoke("send-finance-email", { body });
  } catch {
    /* email delivery is best effort */
  }
}

const emptyLine = (): Line => ({
  description: "",
  quantity: 1,
  unit_price: 0,
  is_upsell: false,
  unit_cost: 0,
});

export default function Invoices({ data }: { data: FinanceSlice }) {
  const { invoices, payments, customers, accounts, reload } = data;
  const [filter, setFilter] = useState<"open" | "paid" | "all">("open");
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);

  const [customerId, setCustomerId] = useState("");
  const [kind, setKind] = useState("recurring");
  const [issuedOn, setIssuedOn] = useState(todayIso());
  const [dueDate, setDueDate] = useState("");
  const [lines, setLines] = useState<Line[]>([emptyLine()]);
  const [visitOptions, setVisitOptions] = useState<VisitOption[]>([]);
  const [visitId, setVisitId] = useState("");

  // Recent visits for the selected pool — upsell lines get attributed to one
  // so the tech who sold it earns commission automatically.
  useEffect(() => {
    let cancelled = false;
    if (!customerId) {
      setVisitOptions([]);
      setVisitId("");
      return;
    }
    void (async () => {
      const { data: rows } = await supabase
        .from("ss_visits")
        .select("id,scheduled_date,tech_id,payout_id")
        .eq("customer_id", customerId)
        .order("scheduled_date", { ascending: false })
        .limit(15);
      if (cancelled) return;
      const list = (rows ?? []) as VisitOption[];
      setVisitOptions(list);
      setVisitId((cur) => (list.some((v) => v.id === cur) ? cur : (list[0]?.id ?? "")));
    })();
    return () => {
      cancelled = true;
    };
  }, [customerId]);

  const nameOf = (id: string) => customers.find((c) => c.id === id)?.full_name ?? "—";
  const total = lines.reduce((s, l) => s + Number(l.quantity || 0) * Number(l.unit_price || 0), 0);
  const upsellTotal = lines
    .filter((l) => l.is_upsell)
    .reduce((s, l) => s + Number(l.quantity || 0) * Number(l.unit_price || 0), 0);
  const lineCost = lines.reduce((s, l) => s + Number(l.quantity || 0) * Number(l.unit_cost || 0), 0);
  const paidOn = useMemo(() => {
    const m: Record<string, number> = {};
    for (const p of payments) if (p.invoice_id) m[p.invoice_id] = (m[p.invoice_id] ?? 0) + Number(p.amount);
    return m;
  }, [payments]);

  const visible = invoices.filter((i) =>
    filter === "all" ? true : filter === "paid" ? i.status === "paid" : i.status !== "paid" && i.status !== "void",
  );

  const setLine = (idx: number, patch: Partial<Line>) =>
    setLines((ls) => ls.map((l, i) => (i === idx ? { ...l, ...patch } : l)));

  const createInvoice = async () => {
    if (!customerId) return toast.error("Pick a customer");
    const clean = lines.filter((l) => l.description.trim() && Number(l.unit_price) > 0);
    if (!clean.length) return toast.error("Add at least one line with a description and price");
    setBusy(true);
    try {
      const number = `SS-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
      const amount = clean.reduce((s, l) => s + l.quantity * l.unit_price, 0);
      const { data: inv, error } = await supabase
        .from("ss_invoices")
        .insert({
          customer_id: customerId,
          invoice_number: number,
          amount,
          kind,
          status: "open",
          issued_on: issuedOn,
          due_date: dueDate || null,
        })
        .select()
        .single();
      if (error) throw error;

      const revenue =
        kind === "recurring"
          ? accountByCode(accounts, "4000")
          : kind === "retail"
            ? accountByCode(accounts, "4200")
            : accountByCode(accounts, "4100");

      const attributedVisit = visitOptions.find((v) => v.id === visitId) ?? null;

      await supabase.from("ss_invoice_items").insert(
        clean.map((l) => ({
          invoice_id: inv.id,
          description: l.description,
          quantity: l.quantity,
          unit_price: l.unit_price,
          line_total: l.quantity * l.unit_price,
          account_id: revenue?.id ?? null,
          // Internal fields — office only, never returned to the customer.
          is_upsell: l.is_upsell,
          unit_cost: l.unit_cost || 0,
          visit_id: l.is_upsell ? (attributedVisit?.id ?? null) : null,
          sold_by_tech_id: l.is_upsell ? (attributedVisit?.tech_id ?? null) : null,
        })),
      );


      await postLedger({
        entry_date: issuedOn,
        account_id: revenue?.id ?? null,
        customer_id: customerId,
        memo: `Invoice ${number} — ${nameOf(customerId)}`,
        debit: amount,
        source: "invoice",
        ref_id: inv.id,
        reference: number,
      });

      void emailFinanceDoc({ type: "invoice", invoiceId: inv.id });

      toast.success(`Invoice ${number} created`, {
        description: "Emailed to the customer if they have an address on file.",
      });
      setCreating(false);
      setLines([emptyLine()]);
      setCustomerId("");
      setDueDate("");
      await reload();
    } catch (err: any) {
      toast.error(err?.message ?? "Could not create the invoice");
    } finally {
      setBusy(false);
    }
  };

  const recordPayment = async (invoiceId: string) => {
    const inv = invoices.find((i) => i.id === invoiceId);
    if (!inv) return;
    const outstanding = Number(inv.amount) - (paidOn[inv.id] ?? 0);
    const raw = window.prompt(`Payment amount for ${inv.invoice_number}`, outstanding.toFixed(2));
    if (raw === null) return;
    const amount = Number(raw);
    if (!Number.isFinite(amount) || amount <= 0) return toast.error("Enter a valid amount");
    try {
      await supabase.from("ss_payments").insert({
        invoice_id: inv.id,
        customer_id: inv.customer_id,
        amount,
        kind: inv.kind,
        method: "manual",
        note: `Applied to ${inv.invoice_number}`,
      });
      const newlyPaid = (paidOn[inv.id] ?? 0) + amount >= Number(inv.amount) - 0.005;
      await supabase
        .from("ss_invoices")
        .update({ status: newlyPaid ? "paid" : "partial", paid_at: newlyPaid ? new Date().toISOString() : null })
        .eq("id", inv.id);
      await postLedger({
        account_id: accountByCode(accounts, "1000")?.id ?? null,
        customer_id: inv.customer_id,
        memo: `Payment received — ${inv.invoice_number}`,
        debit: amount,
        source: "payment",
        ref_id: inv.id,
        reference: inv.invoice_number,
      });
      void emailFinanceDoc({
        type: "receipt",
        invoiceId: inv.id,
        paymentAmount: amount,
        method: "Manual",
      });

      toast.success(`${money2(amount)} recorded`, {
        description: "Receipt emailed to the customer.",
      });
      await reload();
    } catch (err: any) {
      toast.error(err?.message ?? "Could not record the payment");
    }
  };

  const voidInvoice = async (invoiceId: string, number: string) => {
    if (!window.confirm(`Void invoice ${number}? It stays in the ledger for your records.`)) return;
    await supabase.from("ss_invoices").update({ status: "void" }).eq("id", invoiceId);
    toast.success(`${number} voided`);
    await reload();
  };

  const exportCsv = () =>
    downloadCsv(`savvy-invoices-${todayIso()}.csv`, [
      ["Invoice", "Customer", "Issued", "Due", "Type", "Status", "Amount", "Paid", "Balance"],
      ...visible.map((i) => [
        i.invoice_number,
        nameOf(i.customer_id),
        i.issued_on,
        i.due_date ?? "",
        i.kind,
        i.status,
        Number(i.amount).toFixed(2),
        (paidOn[i.id] ?? 0).toFixed(2),
        (Number(i.amount) - (paidOn[i.id] ?? 0)).toFixed(2),
      ]),
    ]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {(["open", "paid", "all"] as const).map((f) => (
          <button key={f} className={`ss-btn ${filter === f ? "" : "ss-btn-ghost"}`} onClick={() => setFilter(f)}>
            {f === "open" ? "Open" : f === "paid" ? "Paid" : "All"}
          </button>
        ))}
        <span className="flex-1" />
        <button className="ss-btn ss-btn-ghost" onClick={exportCsv}>
          <Download size={13} /> Export
        </button>
        <button className="ss-btn" onClick={() => setCreating((v) => !v)}>
          <Plus size={13} /> New invoice
        </button>
      </div>

      {creating && (
        <div className="ss-card p-4 space-y-3">
          <div className="ss-label">New invoice</div>
          <div className="grid gap-2 sm:grid-cols-4">
            <select className="ss-input" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
              <option value="">Select customer…</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.full_name}</option>
              ))}
            </select>
            <select className="ss-input" value={kind} onChange={(e) => setKind(e.target.value)}>
              <option value="recurring">Recurring service</option>
              <option value="job">Repair / job</option>
              <option value="retail">Retail / parts</option>
            </select>
            <input className="ss-input" type="date" value={issuedOn} onChange={(e) => setIssuedOn(e.target.value)} />
            <input className="ss-input" type="date" value={dueDate} placeholder="Due" onChange={(e) => setDueDate(e.target.value)} />
          </div>

          <div className="flex flex-wrap items-center gap-2 rounded-md bg-black/[0.03] px-3 py-2 text-[0.72rem]">
            <EyeOff size={12} className="opacity-60" />
            <span className="opacity-70">
              Internal only — cost and upsell flags never appear on the customer&apos;s invoice.
            </span>
            <span className="flex-1" />
            <span className="ss-label">Attribute upsells to visit</span>
            <select
              className="ss-input w-auto"
              value={visitId}
              onChange={(e) => setVisitId(e.target.value)}
              disabled={!visitOptions.length}
            >
              {!visitOptions.length && <option value="">No visits on file</option>}
              {visitOptions.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.scheduled_date}
                  {v.payout_id ? " (paid out — locked)" : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <div
              className="ss-label grid gap-2 px-1"
              style={{ gridTemplateColumns: "1fr 70px 100px 100px 64px 90px 32px" }}
            >
              <span>Description</span>
              <span>Qty</span>
              <span>Rate</span>
              <span>Our cost</span>
              <span>Upsell</span>
              <span className="text-right">Line</span>
              <span />
            </div>
            {lines.map((l, idx) => (
              <div key={idx} className="grid gap-2" style={{ gridTemplateColumns: "1fr 70px 100px 100px 64px 90px 32px" }}>
                <input
                  className="ss-input"
                  placeholder="Description (e.g. Weekly service — August)"
                  value={l.description}
                  onChange={(e) => setLine(idx, { description: e.target.value })}
                />
                <input
                  className="ss-input ss-num"
                  type="number"
                  min={0}
                  step="0.5"
                  value={l.quantity}
                  onChange={(e) => setLine(idx, { quantity: Number(e.target.value) })}
                />
                <input
                  className="ss-input ss-num"
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="Rate"
                  value={l.unit_price || ""}
                  onChange={(e) => setLine(idx, { unit_price: Number(e.target.value) })}
                />
                <input
                  className="ss-input ss-num"
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="Cost"
                  value={l.unit_cost || ""}
                  onChange={(e) => setLine(idx, { unit_cost: Number(e.target.value) })}
                />
                <label className="flex items-center justify-center self-center">
                  <input
                    type="checkbox"
                    checked={l.is_upsell}
                    onChange={(e) => setLine(idx, { is_upsell: e.target.checked })}
                    aria-label="Mark line as an upsell"
                  />
                </label>
                <div className="ss-num self-center text-right text-[0.8rem] font-semibold">
                  {money2(l.quantity * l.unit_price)}
                </div>
                <button
                  className="ss-btn ss-btn-ghost self-center px-2"
                  onClick={() => setLines((ls) => (ls.length > 1 ? ls.filter((_, i) => i !== idx) : ls))}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
            <button className="ss-btn ss-btn-ghost" onClick={() => setLines((ls) => [...ls, emptyLine()])}>
              <Plus size={13} /> Add line
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3" style={{ borderColor: "hsl(var(--ss-sand))" }}>
            <span className="flex flex-wrap items-center gap-4">
              <span className="ss-label">Total <span className="ss-num text-[1rem]">{money2(total)}</span></span>
              {upsellTotal > 0 && (
                <span className="ss-label opacity-70">
                  Upsell lines <span className="ss-num">{money2(upsellTotal)}</span> — commission is calculated
                  automatically for the tech on the selected visit
                </span>
              )}
              {lineCost > 0 && (
                <span className="ss-label opacity-70">
                  Job margin <span className="ss-num">{money2(total - lineCost)}</span>
                </span>
              )}
            </span>
            <span className="flex gap-2">
              <button className="ss-btn ss-btn-ghost" onClick={() => setCreating(false)}>Cancel</button>
              <button className="ss-btn" disabled={busy} onClick={createInvoice}>
                {busy ? "Saving…" : "Create invoice"}
              </button>
            </span>
          </div>

        </div>
      )}

      <div className="ss-card p-3">
        {!visible.length && <EmptyState>No invoices here yet.</EmptyState>}
        <div className="space-y-1.5">
          {visible.map((i) => {
            const paid = paidOn[i.id] ?? 0;
            const balance = Number(i.amount) - paid;
            const days = ageDays(i.issued_on);
            return (
              <div key={i.id} className="flex flex-wrap items-center gap-2 border-b pb-1.5 text-[0.8rem] last:border-0" style={{ borderColor: "hsl(var(--ss-sand))" }}>
                <span className="ss-num font-semibold">{i.invoice_number}</span>
                <span className="opacity-70">{nameOf(i.customer_id)}</span>
                <Chip tone={i.status === "paid" ? "green" : i.status === "void" ? "ink" : days > 30 ? "burgundy" : "gold"}>
                  {i.status === "paid" ? "paid" : i.status === "void" ? "void" : `${days}d`}
                </Chip>
                <span className="flex-1" />
                <span className="ss-num">{money2(i.amount)}</span>
                {i.status !== "paid" && i.status !== "void" && (
                  <>
                    <span className="ss-num opacity-60">bal {money2(balance)}</span>
                    <button className="ss-btn ss-btn-ghost" onClick={() => recordPayment(i.id)}>Record payment</button>
                    <button className="ss-btn ss-btn-ghost" onClick={() => voidInvoice(i.id, i.invoice_number)}>Void</button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
