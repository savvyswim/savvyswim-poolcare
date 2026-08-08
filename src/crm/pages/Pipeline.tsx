import { useEffect, useMemo, useState } from "react";
import { Link } from "@/lib/router-compat";
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
  converted_customer_id: string | null;
};

type OpsJob = {
  id: string; title: string; status: string; tech_id: string | null;
  customer_id: string; details: string | null; created_at: string;
  ss_customers: { full_name: string; city: string | null } | null;
};

const OPS_COLUMNS: { key: string; label: string }[] = [
  { key: "open", label: "To assign" },
  { key: "scheduled", label: "Scheduled" },
  { key: "completed", label: "Completed" },
];

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
  const [converting, setConverting] = useState(false);
  const [board, setBoard] = useState<"marketing" | "operations">("marketing");

  const { rows, refetch } = useTable<Lead>("pipeline", async () => {
    const { data } = await supabase
      .from("ss_leads")
      .select("id,full_name,phone,email,address,city,stage,monthly_value,pool_size,condition,service_type,cleanup_price,message,source,stage_changed_at,created_at,plan_id,plan_status,converted_customer_id")
      .order("created_at", { ascending: false });
    return (data ?? []) as Lead[];
  });

  const { rows: opsJobs, refetch: refetchJobs } = useTable<OpsJob>("pipeline-ops", async () => {
    const { data } = await supabase
      .from("ss_jobs")
      .select("id,title,status,tech_id,customer_id,details,created_at,ss_customers(full_name,city)")
      .eq("auto_flag_source", "lead_convert")
      .order("created_at", { ascending: false });
    return (data ?? []) as unknown as OpsJob[];
  });

  const { rows: staff } = useTable<{ id: string; full_name: string }>("pipeline-staff", async () => {
    const { data } = await supabase.from("ss_staff").select("id,full_name").eq("is_active", true).order("full_name");
    return data ?? [];
  });

  const marketingRows = useMemo(() => rows.filter((r) => !r.converted_customer_id), [rows]);

  const byStage = useMemo(() => {
    const map: Record<string, Lead[]> = {};
    for (const s of STAGES) map[s.key] = [];
    for (const r of marketingRows) (map[r.stage] ??= []).push(r);
    return map;
  }, [marketingRows]);

  const byOpsStatus = useMemo(() => {
    const map: Record<string, OpsJob[]> = { open: [], scheduled: [], completed: [] };
    for (const j of opsJobs) (map[j.status] ??= []).push(j);
    return map;
  }, [opsJobs]);

  async function assignOps(job: OpsJob, techId: string) {
    const { error } = await supabase.from("ss_jobs").update({ tech_id: techId || null }).eq("id", job.id);
    if (error) { toast.error(error.message); return; }
    const techName = techId ? (staff.find((s) => s.id === techId)?.full_name ?? "tech") : null;
    void logTechAssignment({ customerId: job.customer_id ?? null, jobTitle: job.title, techName });
    toast.success(techId ? "Assigned" : "Unassigned");
    void refetchJobs();
  }


  async function moveOps(job: OpsJob, status: string) {
    const { error } = await supabase
      .from("ss_jobs")
      .update({ status, completed_at: status === "completed" ? new Date().toISOString() : null })
      .eq("id", job.id);
    if (error) { toast.error(error.message); return; }
    void refetchJobs();
  }

  const pipelineValue = useMemo(
    () => marketingRows.filter((r) => !["won", "lost"].includes(r.stage)).reduce((s, r) => s + Number(r.monthly_value || 0), 0),
    [marketingRows],
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
    if (error) { toast.error(error.message); return; }
    toast.success(`${lead.full_name} → ${stage}`);
    setDetail(null);
    void refetch();
  }

  async function setPlan(lead: Lead, planId: string) {
    const { error } = await supabase.from("ss_leads").update({ plan_id: planId }).eq("id", lead.id);
    if (error) { toast.error(error.message); return; }
    setDetail({ ...lead, plan_id: planId });
    toast.success(`Plan set to ${findServicePlan(planId)?.name ?? planId}`);
    void refetch();
  }

  async function convertToInspection(lead: Lead) {
    setConverting(true);
    try {
      const { data: existingLead } = await supabase
        .from("ss_leads")
        .select("converted_customer_id")
        .eq("id", lead.id)
        .maybeSingle();

      let customerId = existingLead?.converted_customer_id ?? null;

      if (!customerId) {
        const { data: cust, error: custErr } = await supabase
          .from("ss_customers")
          .insert({
            full_name: lead.full_name,
            email: lead.email,
            phone: lead.phone,
            address: lead.address,
            city: lead.city,
            status: "inactive",
            monthly_price: Number(lead.monthly_value || 0),
            location_notes: `Converted from lead (${lead.source ?? "marketing"})`,
          })
          .select("id")
          .single();
        if (custErr) throw custErr;
        customerId = cust.id;
      }

      const { error: jobErr } = await supabase.from("ss_jobs").insert({
        customer_id: customerId,
        title: "Pool inspection",
        details: [lead.address, lead.city].filter(Boolean).join(", ") || lead.message || null,
        status: "open",
        price: 0,
        auto_flag_source: "lead_convert",
      });
      if (jobErr) throw jobErr;

      await supabase
        .from("ss_leads")
        .update({ converted_customer_id: customerId, stage: "contacted", stage_changed_at: new Date().toISOString() })
        .eq("id", lead.id);

      toast.success("Inspection created — assign a tech in Jobs & repairs");
      setDetail(null);
      void refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Convert failed");
    } finally {
      setConverting(false);
    }
  }



  return (
    <div className="space-y-4">
      <SectionTitle
        title={board === "marketing" ? "Marketing pipeline" : "Operations pipeline"}
        sub={
          board === "marketing"
            ? `${marketingRows.length} open leads · ${money(pipelineValue)}/mo open value`
            : `${opsJobs.length} converted inspections · ${byOpsStatus["open"]?.length ?? 0} waiting to assign`
        }
      />

      <div className="flex gap-1.5">
        <button className={`ss-btn ${board === "marketing" ? "" : "ss-btn-ghost"}`} onClick={() => setBoard("marketing")}>
          Marketing · {marketingRows.length}
        </button>
        <button className={`ss-btn ${board === "operations" ? "" : "ss-btn-ghost"}`} onClick={() => setBoard("operations")}>
          Operations · {opsJobs.length}
        </button>
      </div>

      {board === "marketing" && (
        <>
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
        </>
      )}

      {board === "operations" && (
        <div className="grid gap-3 md:grid-cols-3">
          {OPS_COLUMNS.map((c) => (
            <div key={c.key} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="ss-tag">{c.label}</span>
                <span className="ss-num text-[0.72rem] opacity-60">{byOpsStatus[c.key]?.length ?? 0}</span>
              </div>
              {!byOpsStatus[c.key]?.length && <EmptyState>—</EmptyState>}
              {byOpsStatus[c.key]?.map((j) => (
                <div key={j.id} className="ss-card p-3">
                  <div className="text-[0.86rem] font-semibold" style={{ color: "hsl(var(--ss-burgundy))" }}>
                    {j.ss_customers?.full_name ?? "Customer"}
                  </div>
                  <div className="text-[0.72rem] opacity-65">{j.title} · {j.ss_customers?.city ?? j.details ?? "—"}</div>
                  <select
                    className="ss-input mt-2 w-full text-[0.78rem]"
                    value={j.tech_id ?? ""}
                    onChange={(e) => void assignOps(j, e.target.value)}
                  >
                    <option value="">Unassigned</option>
                    {staff.map((t) => (
                      <option key={t.id} value={t.id}>{t.full_name}</option>
                    ))}
                  </select>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {OPS_COLUMNS.filter((x) => x.key !== j.status).map((x) => (
                      <button key={x.key} className="ss-btn ss-btn-ghost text-[0.72rem]" onClick={() => void moveOps(j, x.key)}>
                        → {x.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}



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



            <button
              className="ss-btn mt-4 w-full justify-center"
              disabled={converting}
              onClick={() => convertToInspection(detail)}
            >
              {converting ? "Converting…" : "CONVERT TO INSPECTION"}
            </button>
            <div className="mt-1 text-center text-[0.7rem] opacity-60">
              Creates the customer record and an open inspection job in Jobs &amp; repairs to assign a tech.
            </div>

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
