import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Chip, EmptyState, SectionTitle } from "@/crm/components/Brand";
import { useTable } from "@/crm/lib/useSavvy";
import { money } from "@/crm/lib/pricing";
import { SERVICE_PLANS, findServicePlan } from "@/crm/lib/pricingEngine";

type LeadEvent = {
  id: string; event_type: string; label: string; detail: string | null; created_at: string;
};

const EVENT_TONE: Record<string, string> = {
  created: "var(--ss-sand)",
  plan_matched: "var(--ss-gold)",
  plan_quoted: "var(--ss-aqua)",
  plan_status: "var(--ss-aqua)",
  stage: "var(--ss-burgundy)",
};

function LeadTimeline({ leadId }: { leadId: string }) {
  const [events, setEvents] = useState<LeadEvent[] | null>(null);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const { data } = await supabase
        .from("ss_lead_events")
        .select("id,event_type,label,detail,created_at")
        .eq("lead_id", leadId)
        .order("created_at", { ascending: false });
      if (alive) setEvents((data ?? []) as LeadEvent[]);
    })();
    return () => { alive = false; };
  }, [leadId]);

  return (
    <div className="mt-4 rounded-md border p-3" style={{ borderColor: "hsl(var(--ss-sand))" }}>
      <div className="ss-label mb-2">Audit timeline</div>
      {events === null && <div className="text-[0.75rem] opacity-60">Loading…</div>}
      {events?.length === 0 && <div className="text-[0.75rem] opacity-60">No activity recorded yet.</div>}
      {!!events?.length && (
        <ol className="max-h-56 space-y-2.5 overflow-y-auto pr-1">
          {events.map((e) => (
            <li key={e.id} className="flex gap-2.5">
              <span
                className="mt-[6px] h-2 w-2 shrink-0 rounded-full"
                style={{ background: `hsl(${EVENT_TONE[e.event_type] ?? "var(--ss-sand)"})` }}
              />
              <div className="min-w-0">
                <div className="text-[0.8rem] font-semibold">{e.label}</div>
                {e.detail && (
                  <div className="text-[0.72rem] opacity-70">
                    {findServicePlan(e.detail)?.name ?? e.detail}
                  </div>
                )}
                <div className="ss-num text-[0.68rem] opacity-55">
                  {new Date(e.created_at).toLocaleString()}
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}


type Lead = {
  id: string; full_name: string; phone: string | null; email: string | null;
  address: string | null; city: string | null; stage: string; monthly_value: number;
  pool_size: string | null; condition: string | null; service_type: string | null;
  cleanup_price: number | null; message: string | null; source: string | null;
  stage_changed_at: string | null; created_at: string;
  plan_id: string | null; plan_status: string | null;
};

type Stage = "new_lead" | "contacted" | "quote_sent" | "follow_up" | "won" | "lost";

const STAGES: { key: Stage; label: string }[] = [
  { key: "new_lead", label: "New" },
  { key: "contacted", label: "Contacted" },
  { key: "quote_sent", label: "Quoted" },
  { key: "follow_up", label: "Follow-up" },
  { key: "won", label: "Won" },
  { key: "lost", label: "Lost" },
];

const PLAN_STATUS: Record<string, { label: string; tone: "aqua" | "gold" | "green" | "burgundy" }> = {
  recommended: { label: "Plan matched", tone: "gold" },
  quoted: { label: "Plan quoted", tone: "aqua" },
  won: { label: "Plan active", tone: "green" },
  lost: { label: "Plan lost", tone: "burgundy" },
};

export default function Pipeline() {
  const [detail, setDetail] = useState<Lead | null>(null);

  const { rows, refetch } = useTable<Lead>("pipeline", async () => {
    const { data } = await supabase
      .from("ss_leads")
      .select("id,full_name,phone,email,address,city,stage,monthly_value,pool_size,condition,service_type,cleanup_price,message,source,stage_changed_at,created_at,plan_id,plan_status")
      .order("created_at", { ascending: false });
    return (data ?? []) as Lead[];
  });

  const byStage = useMemo(() => {
    const map: Record<string, Lead[]> = {};
    for (const s of STAGES) map[s.key] = [];
    for (const r of rows) (map[r.stage] ??= []).push(r);
    return map;
  }, [rows]);

  const pipelineValue = useMemo(
    () => rows.filter((r) => !["won", "lost"].includes(r.stage)).reduce((s, r) => s + Number(r.monthly_value || 0), 0),
    [rows],
  );

  const planCounts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const r of rows) if (r.plan_id) m[r.plan_id] = (m[r.plan_id] ?? 0) + 1;
    return m;
  }, [rows]);

  async function move(lead: Lead, stage: Stage) {
    const { error } = await supabase
      .from("ss_leads")
      .update({ stage, stage_changed_at: new Date().toISOString() })
      .eq("id", lead.id);
    if (error) return toast.error(error.message);
    toast.success(`${lead.full_name} → ${stage}`);
    setDetail(null);
    void refetch();
  }

  async function setPlan(lead: Lead, planId: string) {
    const { error } = await supabase.from("ss_leads").update({ plan_id: planId }).eq("id", lead.id);
    if (error) return toast.error(error.message);
    setDetail({ ...lead, plan_id: planId });
    toast.success(`Plan set to ${findServicePlan(planId)?.name ?? planId}`);
    void refetch();
  }


  return (
    <div className="space-y-4">
      <SectionTitle
        title="Pipeline"
        sub={`${rows.length} leads · ${money(pipelineValue)}/mo open value`}
      />

      <div className="ss-card p-4">
        <div className="ss-label mb-2">Auto-matched plans · every new lead lands on an eligible tier</div>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {SERVICE_PLANS.map((p) => (
            <div key={p.id} className="rounded-md border p-2.5" style={{ borderColor: "hsl(var(--ss-sand))" }}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[0.83rem] font-semibold">{p.name}</span>
                <span className="ss-num text-[0.78rem] opacity-70">{planCounts[p.id] ?? 0}</span>
              </div>
              <div className="mt-0.5 text-[0.7rem] opacity-65">{p.tagline}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        {STAGES.map((s) => (
          <div key={s.key} className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="ss-tag">{s.label}</span>
              <span className="ss-num text-[0.72rem] opacity-60">{byStage[s.key]?.length ?? 0}</span>
            </div>
            {!byStage[s.key]?.length && <EmptyState>—</EmptyState>}
            {byStage[s.key]?.map((l) => (
              <button key={l.id} className="ss-card w-full p-3 text-left" onClick={() => setDetail(l)}>
                <div className="text-[0.86rem] font-semibold" style={{ color: "hsl(var(--ss-burgundy))" }}>{l.full_name}</div>
                <div className="text-[0.72rem] opacity-65">{l.city ?? "—"} · {l.pool_size ?? "—"}</div>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <Chip tone="green">{money(l.monthly_value)}/mo</Chip>
                  {l.plan_id && (
                    <Chip tone={PLAN_STATUS[l.plan_status ?? "recommended"]?.tone ?? "gold"}>
                      {findServicePlan(l.plan_id)?.name ?? l.plan_id}
                    </Chip>
                  )}
                  {l.cleanup_price ? <Chip tone="gold">Clean-up {money(l.cleanup_price)}</Chip> : null}
                  {l.source && <Chip tone="aqua">{l.source}</Chip>}
                </div>
              </button>
            ))}
          </div>
        ))}
      </div>


      {detail && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/45" onClick={() => setDetail(null)} />
          <div className="savvy-crm relative w-full max-w-md rounded-[16px] p-5" style={{ background: "hsl(var(--ss-cream))" }}>
            <h2 className="text-[1.05rem]">{detail.full_name}</h2>
            <div className="mt-1 text-[0.78rem] opacity-70">
              {detail.address}, {detail.city} · {detail.phone} · {detail.email}
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-[0.8rem]">
              <Field label="Pool size" value={detail.pool_size} />
              <Field label="Condition" value={detail.condition} />
              <Field label="Service" value={detail.service_type} />
              <Field label="Monthly" value={money(detail.monthly_value)} />
            </dl>
            {detail.message && <p className="mt-3 text-[0.82rem]">{detail.message}</p>}

            <div className="mt-4 rounded-md border p-3" style={{ borderColor: "hsl(var(--ss-sand))" }}>
              <div className="flex items-center justify-between gap-2">
                <span className="ss-label">Eligible service plan</span>
                <Chip tone={PLAN_STATUS[detail.plan_status ?? "recommended"]?.tone ?? "gold"}>
                  {PLAN_STATUS[detail.plan_status ?? "recommended"]?.label ?? "Plan matched"}
                </Chip>
              </div>
              <div className="mt-1.5 text-[0.9rem] font-semibold">
                {findServicePlan(detail.plan_id)?.name ?? "Not matched yet"}
              </div>
              <ul className="mt-1.5 space-y-1 text-[0.75rem]">
                {(findServicePlan(detail.plan_id)?.scope ?? []).map((s) => (
                  <li key={s} className="flex gap-1.5">
                    <span className="opacity-40">—</span>
                    <span className="opacity-85">{s}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {SERVICE_PLANS.filter((p) => p.id !== detail.plan_id).map((p) => (
                  <button key={p.id} className="ss-btn ss-btn-ghost" onClick={() => setPlan(detail, p.id)}>
                    {p.name}
                  </button>
                ))}
              </div>
              {detail.plan_id && (
                <Link
                  className="ss-btn mt-2 w-full justify-center !no-underline"
                  to={`/admin/crm/products?plan_id=${detail.plan_id}`}
                >
                  QUOTE THIS PLAN
                </Link>
              )}
            </div>

            <LeadTimeline key={`${detail.id}-${detail.plan_id ?? "none"}`} leadId={detail.id} />



            <div className="mt-4">
              <div className="ss-label mb-1.5">Move to stage</div>
              <div className="flex flex-wrap gap-1.5">
                {STAGES.filter((s) => s.key !== detail.stage).map((s) => (
                  <button key={s.key} className="ss-btn ss-btn-ghost" onClick={() => move(detail, s.key)}>{s.label}</button>
                ))}
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              {detail.phone && <a className="ss-btn flex-1 !no-underline" href={`tel:${detail.phone}`}>Call</a>}
              {detail.phone && <a className="ss-btn ss-btn-ghost flex-1 !no-underline" href={`sms:${detail.phone}`}>Text</a>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="ss-label">{label}</dt>
      <dd>{value ?? "—"}</dd>
    </div>
  );
}
