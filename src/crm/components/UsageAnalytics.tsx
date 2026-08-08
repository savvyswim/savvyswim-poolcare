import { useEffect, useMemo, useState } from "react";
import { Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Chip, EmptyState } from "@/crm/components/Brand";

export type AnalyticsItem = {
  id: string;
  name: string;
  unit: string | null;
  quantity: number;
  low_threshold: number;
};

type UsageMove = {
  id: string;
  item_id: string;
  item_name: string;
  delta: number;
  reason: string;
  created_at: string;
  visit_id: string | null;
  job_id: string | null;
  total_cost: number | null;
  ss_customers?: { full_name: string } | null;
};

const DAY = 24 * 60 * 60 * 1000;
const round = (n: number) => Math.round(n * 100) / 100;
const isUsage = (m: UsageMove) =>
  m.delta < 0 && (!!m.visit_id || !!m.job_id || m.reason === "usage" || m.reason === "used_on_job");

const stamp = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });

/**
 * At-a-glance consumption analytics: 7/30/90-day burn per item, the visits
 * that consumed the most, and a days-of-stock projection off the 90-day rate.
 */
export default function UsageAnalytics({ items }: { items: AnalyticsItem[] }) {
  const [moves, setMoves] = useState<UsageMove[] | null>(null);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const since = new Date(Date.now() - 90 * DAY).toISOString();
      const { data } = await supabase
        .from("ss_inventory_moves")
        .select("id,item_id,item_name,delta,reason,created_at,visit_id,job_id,total_cost,ss_customers(full_name)")
        .lt("delta", 0)
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(2000);
      if (alive) setMoves(((data ?? []) as unknown as UsageMove[]).filter(isUsage));
    })();
    return () => { alive = false; };
  }, []);

  const stats = useMemo(() => {
    const now = Date.now();
    const base = new Map(
      items.map((i) => [
        i.id,
        { item: i, d7: 0, d30: 0, d90: 0, cost90: 0, events: 0 },
      ]),
    );
    for (const m of moves ?? []) {
      const row = base.get(m.item_id);
      if (!row) continue;
      const age = now - new Date(m.created_at).getTime();
      const qty = Math.abs(Number(m.delta) || 0);
      row.d90 += qty;
      row.cost90 += Number(m.total_cost) || 0;
      row.events += 1;
      if (age <= 30 * DAY) row.d30 += qty;
      if (age <= 7 * DAY) row.d7 += qty;
    }
    return [...base.values()]
      .map((r) => {
        const perDay = r.d90 / 90;
        const daysLeft = perDay > 0 ? Math.floor(Number(r.item.quantity) / perDay) : null;
        // Direction compares the last 7 days against the trailing 90-day weekly pace.
        const weekly90 = r.d90 / (90 / 7);
        const trend = weekly90 === 0 ? 0 : (r.d7 - weekly90) / weekly90;
        return { ...r, perDay, daysLeft, trend };
      })
      .sort((a, b) => b.d30 - a.d30 || b.d90 - a.d90);
  }, [items, moves]);

  const active = stats.filter((s) => s.d90 > 0);
  const peak = Math.max(1, ...active.map((s) => s.d90));

  const topVisits = useMemo(() => {
    const m = new Map<string, { key: string; who: string; when: string; qty: number; cost: number; items: Set<string> }>();
    for (const mv of moves ?? []) {
      const key = mv.visit_id ?? mv.job_id;
      if (!key) continue;
      const cur = m.get(key) ?? {
        key,
        who: mv.ss_customers?.full_name ?? (mv.visit_id ? "Visit" : "Job"),
        when: mv.created_at,
        qty: 0,
        cost: 0,
        items: new Set<string>(),
      };
      cur.qty += Math.abs(Number(mv.delta) || 0);
      cur.cost += Number(mv.total_cost) || 0;
      cur.items.add(mv.item_name);
      m.set(key, cur);
    }
    return [...m.values()].sort((a, b) => b.cost - a.cost || b.qty - a.qty).slice(0, 6);
  }, [moves]);

  if (moves === null) {
    return <div className="ss-card p-4 text-[0.8rem] opacity-60">Loading usage analytics…</div>;
  }

  return (
    <div className="ss-card space-y-4 p-4">
      <div className="flex items-center gap-2">
        <span className="ss-tag flex items-center gap-1"><Activity size={12} /> Usage analytics</span>
        <span className="text-[0.72rem] opacity-60">last 90 days · {moves.length} consumption entries</span>
      </div>

      {!active.length && <EmptyState>No consumption logged in the last 90 days yet.</EmptyState>}

      {active.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-[0.78rem]">
            <thead>
              <tr className="text-left">
                {["Item", "7d", "30d", "90d", "Trend", "Per day", "Days of stock"].map((h) => (
                  <th key={h} className="ss-label border-b px-2 py-1.5" style={{ borderColor: "hsl(var(--ss-sand))" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {active.map((s) => {
                const unit = s.item.unit ?? "ea";
                const critical = s.daysLeft !== null && s.daysLeft <= 14;
                return (
                  <tr key={s.item.id} className="border-b" style={{ borderColor: "hsl(var(--ss-sand))" }}>
                    <td className="px-2 py-2">
                      <div className="font-semibold">{s.item.name}</div>
                      <div className="mt-1 h-1.5 w-28" style={{ background: "hsl(var(--ss-sand))" }}>
                        <div
                          className="h-full"
                          style={{ width: `${Math.round((s.d90 / peak) * 100)}%`, background: "hsl(var(--ss-burgundy))" }}
                        />
                      </div>
                    </td>
                    <td className="ss-num px-2 py-2">{round(s.d7)}</td>
                    <td className="ss-num px-2 py-2">{round(s.d30)}</td>
                    <td className="ss-num px-2 py-2">{round(s.d90)} {unit}</td>
                    <td className="px-2 py-2">
                      {s.trend > 0.15 ? <Chip tone="orange">↑ {Math.round(s.trend * 100)}%</Chip>
                        : s.trend < -0.15 ? <Chip>↓ {Math.round(Math.abs(s.trend) * 100)}%</Chip>
                        : <span className="opacity-55">steady</span>}
                    </td>
                    <td className="ss-num px-2 py-2">{round(s.perDay)}</td>
                    <td className="px-2 py-2">
                      {s.daysLeft === null ? <span className="opacity-55">—</span>
                        : critical ? <Chip tone="orange">{s.daysLeft} days</Chip>
                        : <span className="ss-num">{s.daysLeft} days</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {topVisits.length > 0 && (
        <div>
          <div className="ss-label mb-2">Top consuming visits</div>
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {topVisits.map((v) => (
              <div key={v.key} className="border p-2.5" style={{ borderColor: "hsl(var(--ss-sand))" }}>
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-[0.82rem] font-semibold">{v.who}</span>
                  <span className="ss-num text-[0.74rem]">${v.cost.toFixed(2)}</span>
                </div>
                <div className="mt-0.5 text-[0.7rem] opacity-60">
                  {stamp(v.when)} · {round(v.qty)} units · {[...v.items].slice(0, 3).join(", ")}
                  {v.items.size > 3 ? ` +${v.items.size - 3}` : ""}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
