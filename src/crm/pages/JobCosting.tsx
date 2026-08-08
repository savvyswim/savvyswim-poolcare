import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Chip, EmptyState, SectionTitle, StatTile } from "@/crm/components/Brand";
import { money } from "@/crm/lib/pricing";

type Job = { id: string; title: string; price: number; status: string; ss_customers: { full_name: string } | null };
type Time = { job_id: string; minutes: number; hourly_rate: number; source: string };
type Expense = { job_id: string; amount: number };
type Move = { job_id: string | null; item_name: string; delta: number; total_cost: number | null };

/** Company-wide job costing: revenue vs labor + materials, worst margins first. */
export default function JobCosting() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [time, setTime] = useState<Time[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [moves, setMoves] = useState<Move[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [j, t, e, m] = await Promise.all([
      supabase.from("ss_jobs").select("id,title,price,status,ss_customers(full_name)").order("created_at", { ascending: false }).limit(300),
      supabase.from("ss_job_time_entries").select("job_id,minutes,hourly_rate,source"),
      supabase.from("ss_job_expenses").select("job_id,amount"),
      supabase.from("ss_inventory_moves").select("job_id,item_name,delta,total_cost").not("job_id", "is", null).lt("delta", 0).limit(4000),
    ]);
    setJobs((j.data ?? []) as unknown as Job[]);
    setTime((t.data ?? []) as Time[]);
    setExpenses((e.data ?? []) as Expense[]);
    setMoves((m.data ?? []) as Move[]);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const rows = useMemo(() => {
    return jobs
      .map((job) => {
        const entries = time.filter((x) => x.job_id === job.id);
        const labor = entries.reduce((s, x) => s + (Number(x.minutes) / 60) * Number(x.hourly_rate), 0);
        const minutes = entries.reduce((s, x) => s + Number(x.minutes), 0);
        const autoMinutes = entries.filter((x) => x.source === "auto").reduce((s, x) => s + Number(x.minutes), 0);
        const material = expenses.filter((x) => x.job_id === job.id).reduce((s, x) => s + Number(x.amount), 0);
        const used = moves.filter((x) => x.job_id === job.id);
        const inventory = used.reduce((s, x) => s + (Number(x.total_cost) || 0), 0);
        const inventoryItems = used.length;
        const revenue = Number(job.price ?? 0);
        const cost = labor + material + inventory;
        const profit = revenue - cost;
        return {
          job, labor, material, inventory, inventoryItems, minutes, autoMinutes, revenue, cost, profit,
          margin: revenue > 0 ? (profit / revenue) * 100 : 0,
          hourly: minutes > 0 ? profit / (minutes / 60) : 0,
        };
      })
      .filter((r) => r.revenue > 0 || r.cost > 0)
      .sort((a, b) => a.margin - b.margin);
  }, [jobs, time, expenses, moves]);


  const totals = useMemo(() => {
    const revenue = rows.reduce((s, r) => s + r.revenue, 0);
    const cost = rows.reduce((s, r) => s + r.cost, 0);
    const inventory = rows.reduce((s, r) => s + r.inventory, 0);
    const minutes = rows.reduce((s, r) => s + r.minutes, 0);
    const auto = rows.reduce((s, r) => s + r.autoMinutes, 0);
    return {
      revenue, cost, inventory, profit: revenue - cost,
      margin: revenue > 0 ? ((revenue - cost) / revenue) * 100 : 0,
      invShare: revenue > 0 ? (inventory / revenue) * 100 : 0,
      hours: minutes / 60,
      autoShare: minutes > 0 ? (auto / minutes) * 100 : 0,
    };
  }, [rows]);

  return (
    <div className="space-y-4">
      <SectionTitle title="Job Costing" sub="Every job's true profit after labor, materials and inventory used" />

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-5">
        <StatTile label="Revenue" value={money(totals.revenue)} />
        <StatTile label="Cost" value={money(totals.cost)} />
        <StatTile label="Inventory used" value={`${money(totals.inventory)} · ${totals.invShare.toFixed(1)}% of rev`} />
        <StatTile label="Profit" value={`${money(totals.profit)} · ${totals.margin.toFixed(1)}%`} />
        <StatTile label="Tracked hours" value={`${totals.hours.toFixed(1)}h · ${totals.autoShare.toFixed(0)}% auto`} />
      </div>


      {loading && <EmptyState>Crunching the numbers…</EmptyState>}
      {!loading && !rows.length && <EmptyState>No costed jobs yet.</EmptyState>}

      <div className="space-y-1.5">
        {rows.map((r) => (
          <div key={r.job.id} className="ss-card p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-[0.85rem] font-semibold">{r.job.title}</div>
                <div className="text-[0.7rem] opacity-70">
                  {r.job.ss_customers?.full_name ?? "Unassigned"} · {(r.minutes / 60).toFixed(1)}h logged
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <Chip tone={r.margin >= 45 ? "green" : r.margin >= 25 ? "gold" : "orange"}>
                  {r.margin.toFixed(0)}% margin
                </Chip>
                <Chip tone="ink">{money(r.profit)} profit</Chip>
              </div>
            </div>
            <div className="mt-1.5 text-[0.72rem] opacity-75">
              Revenue {money(r.revenue)} · Labor {money(r.labor)} · Materials {money(r.material)} · Inventory{" "}
              {money(r.inventory)}
              {r.inventoryItems > 0 && <> ({r.inventoryItems} item{r.inventoryItems === 1 ? "" : "s"})</>}
              {r.minutes > 0 && <> · {money(r.hourly)}/hr effective</>}
            </div>

          </div>
        ))}
      </div>
    </div>
  );
}
