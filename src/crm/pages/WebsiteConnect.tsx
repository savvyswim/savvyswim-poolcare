import { useMemo, useState } from "react";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Chip, EmptyState, SectionTitle } from "@/crm/components/Brand";
import { useTable } from "@/crm/lib/useSavvy";
import { money } from "@/crm/lib/pricing";

type Lead = { id: string; full_name: string; city: string | null; source: string | null; monthly_value: number; created_at: string; stage: string };

export default function WebsiteConnect() {
  const [copied, setCopied] = useState("");

  const { rows: leads } = useTable<Lead>("connect-leads", async () => {
    const { data } = await supabase
      .from("ss_leads")
      .select("id,full_name,city,source,monthly_value,created_at,stage")
      .order("created_at", { ascending: false })
      .limit(30);
    return (data ?? []) as Lead[];
  });

  const bySource = useMemo(() => {
    const m: Record<string, number> = {};
    for (const l of leads) m[l.source ?? "direct"] = (m[l.source ?? "direct"] ?? 0) + 1;
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [leads]);

  const quoteUrl = `${window.location.origin}/quote`;
  const embed = `<iframe src="${quoteUrl}?embed=1" style="width:100%;height:720px;border:0" title="Savvy Swim instant quote"></iframe>`;

  function copy(label: string, value: string) {
    void navigator.clipboard.writeText(value);
    setCopied(label);
    toast.success(`${label} copied`);
  }

  return (
    <div className="space-y-4">
      <SectionTitle title="Website connect" sub="savvyswim.com quote form → pipeline" />

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="ss-card p-4">
          <div className="ss-label mb-2">Public quote form</div>
          <div className="flex flex-wrap items-center gap-2">
            <a className="ss-btn !no-underline" href="/quote" target="_blank" rel="noreferrer">Open form</a>
            <button className="ss-btn ss-btn-ghost" onClick={() => copy("Quote link", quoteUrl)}>
              <Copy size={13} /> {copied === "Quote link" ? "Copied" : "Copy link"}
            </button>
          </div>
          <div className="ss-label mt-3">Embed snippet</div>
          <textarea className="ss-input ss-num" rows={3} readOnly value={embed} onFocus={(e) => e.currentTarget.select()} />
          <button className="ss-btn ss-btn-ghost mt-2" onClick={() => copy("Embed code", embed)}>
            <Copy size={13} /> {copied === "Embed code" ? "Copied" : "Copy embed"}
          </button>
          <p className="mt-3 text-[0.78rem] opacity-70">
            Every submission lands in the pipeline as a new lead with city pricing already applied.
          </p>
        </div>

        <div className="ss-card p-4">
          <div className="ss-label mb-2">Lead sources</div>
          {!bySource.length && <EmptyState>No leads yet.</EmptyState>}
          <div className="space-y-1.5">
            {bySource.map(([src, n]) => (
              <div key={src} className="flex items-center justify-between text-[0.83rem]">
                <span>{src}</span>
                <span className="ss-num opacity-70">{n}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="ss-card p-4">
        <div className="ss-label mb-2">Latest submissions</div>
        {!leads.length && <EmptyState>Nothing submitted yet.</EmptyState>}
        <div className="space-y-1.5">
          {leads.map((l) => (
            <div key={l.id} className="flex flex-wrap items-center justify-between gap-2 text-[0.83rem]">
              <span>
                <strong>{l.full_name}</strong>
                <span className="opacity-60"> · {l.city ?? "—"} · {new Date(l.created_at).toLocaleDateString()}</span>
              </span>
              <span className="flex items-center gap-2">
                <Chip tone="aqua">{l.stage.replace("_", " ")}</Chip>
                <span className="ss-num font-semibold">{money(l.monthly_value)}/mo</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
