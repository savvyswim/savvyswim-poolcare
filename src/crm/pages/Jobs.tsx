import { useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Chip, EmptyState, SectionTitle } from "@/crm/components/Brand";
import { useTable } from "@/crm/lib/useSavvy";
import { money } from "@/crm/lib/pricing";
import JobProfit from "@/crm/components/JobProfit";
import { runAutomations } from "@/crm/lib/automations";
import { logTechAssignment } from "@/crm/lib/activity";



type Job = {
  id: string; title: string; details: string | null; price: number | null;
  status: string; due_date: string | null; auto_flag_source: string | null;
  customer_id: string | null; tech_id: string | null;
  ss_customers: { full_name: string; city: string | null } | null;
};

const FILTERS = ["open", "scheduled", "completed"] as const;

export default function Jobs() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("open");
  const [openId, setOpenId] = useState<string | null>(null);


  const { rows, refetch } = useTable<Job>("jobs", async () => {
    const { data } = await supabase
      .from("ss_jobs")
      .select("id,title,details,price,status,due_date,auto_flag_source,customer_id,tech_id,ss_customers(full_name,city)")
      .order("created_at", { ascending: false });
    return (data ?? []) as unknown as Job[];
  });

  const { rows: staff } = useTable<{ id: string; full_name: string; is_active: boolean }>("jobs-staff", async () => {
    const { data } = await supabase.from("ss_staff").select("id,full_name,is_active").eq("is_active", true).order("full_name");
    return data ?? [];
  });

  async function assign(job: Job, techId: string) {
    const { error } = await supabase.from("ss_jobs").update({ tech_id: techId || null }).eq("id", job.id);
    if (error) { toast.error(error.message); return; }
    const techName = techId ? (staff.find((s) => s.id === techId)?.full_name ?? "tech") : null;
    void logTechAssignment({ customerId: job.customer_id, jobTitle: job.title, techName });
    toast.success(techId ? `Assigned to ${techName}` : "Unassigned");
    void refetch();
  }


  const shown = useMemo(() => rows.filter((j) => j.status === filter), [rows, filter]);
  const openValue = useMemo(
    () => rows.filter((j) => j.status !== "completed").reduce((s, j) => s + Number(j.price ?? 0), 0),
    [rows],
  );

  async function setStatus(job: Job, status: string) {
    const { error } = await supabase
      .from("ss_jobs")
      .update({ status, completed_at: status === "completed" ? new Date().toISOString() : null })
      .eq("id", job.id);
    if (error) { toast.error(error.message); return; }
    if (status === "completed") {
      void runAutomations("job_completed", {
        customerId: job.customer_id,
        customerName: job.ss_customers?.full_name ?? null,
        city: job.ss_customers?.city ?? null,
        amount: Number(job.price ?? 0),
        title: job.title,
      });
    }
    void refetch();
  }

  return (
    <div className="space-y-4">
      <SectionTitle title="Jobs & repairs" sub={`${money(openValue)} in open work`} />
      <div className="flex gap-1.5">
        {FILTERS.map((f) => (
          <button key={f} className={`ss-btn ${filter === f ? "" : "ss-btn-ghost"}`} onClick={() => setFilter(f)}>
            {f} · {rows.filter((j) => j.status === f).length}
          </button>
        ))}
      </div>
      <div className="space-y-2">
        {!shown.length && <EmptyState>Nothing here.</EmptyState>}
        {shown.map((j) => (
          <div key={j.id} className="ss-card p-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[0.9rem] font-semibold" style={{ color: "hsl(var(--ss-burgundy))" }}>{j.title}</span>
                  {j.auto_flag_source && <Chip tone="orange">auto: {j.auto_flag_source}</Chip>}
                </div>
                <div className="text-[0.75rem] opacity-70">
                  {j.ss_customers?.full_name ?? "Unassigned"} · {j.ss_customers?.city ?? "—"}
                  {j.due_date ? ` · due ${new Date(j.due_date).toLocaleDateString()}` : ""}
                </div>
                {j.details && <div className="mt-1 text-[0.8rem] opacity-85">{j.details}</div>}
              </div>
              <div className="ss-num font-bold">{money(j.price ?? 0)}</div>
              <select
                className="ss-input !mt-0 !w-auto"
                value={j.tech_id ?? ""}
                onChange={(e) => assign(j, e.target.value)}
              >
                <option value="">Unassigned</option>
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>{s.full_name}</option>
                ))}
              </select>
              <button
                className="ss-btn ss-btn-ghost"
                onClick={() => setOpenId(openId === j.id ? null : j.id)}
              >
                {openId === j.id ? "Hide costs" : "Costs & profit"}
              </button>
              {j.status !== "completed" && (
                <button className="ss-btn" onClick={() => setStatus(j, j.status === "open" ? "scheduled" : "completed")}>
                  {j.status === "open" ? "Schedule" : "Complete"}
                </button>
              )}
            </div>
            {openId === j.id && <JobProfit jobId={j.id} price={Number(j.price ?? 0)} />}
          </div>
        ))}

      </div>
    </div>
  );
}
