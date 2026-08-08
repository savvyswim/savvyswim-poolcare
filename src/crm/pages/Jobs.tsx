import { useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Chip, EmptyState, SectionTitle } from "@/crm/components/Brand";
import { useTable } from "@/crm/lib/useSavvy";
import { money } from "@/crm/lib/pricing";
import JobProfit from "@/crm/components/JobProfit";


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
