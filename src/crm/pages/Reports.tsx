import { useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { EmptyState, SectionTitle, StatTile } from "@/crm/components/Brand";
import { useSavvyIdentity, useTable } from "@/crm/lib/useSavvy";
import { money } from "@/crm/lib/pricing";

type Visit = { id: string; scheduled_date: string; status: string; minutes_on_site: number | null; chem_cost: number | null; tech_id: string | null };

export default function Reports() {
  const { level } = useSavvyIdentity();

  const { rows: visits } = useTable<Visit>("report-visits", async () => {
    const { data } = await supabase
      .from("ss_visits")
      .select("id,scheduled_date,status,minutes_on_site,chem_cost,tech_id")
      .gte("scheduled_date", new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10));
    return (data ?? []) as Visit[];
  });

  const { rows: staff } = useTable<{ id: string; full_name: string }>("report-staff", async () => {
    const { data } = await supabase.from("ss_staff").select("id,full_name");
    return data ?? [];
  });

  const completed = useMemo(() => visits.filter((v) => v.status === "completed"), [visits]);

  const stats = useMemo(() => {
    const mins = completed.map((v) => v.minutes_on_site ?? 0).filter(Boolean);
    return {
      completed: completed.length,
      completionRate: visits.length ? Math.round((completed.length / visits.length) * 100) : 0,
      avgMinutes: mins.length ? Math.round(mins.reduce((a, b) => a + b, 0) / mins.length) : 0,
      chemSpend: completed.reduce((s, v) => s + Number(v.chem_cost ?? 0), 0),
    };
  }, [visits, completed]);

  const perTech = useMemo(() => {
    const m: Record<string, { visits: number; minutes: number }> = {};
    for (const v of completed) {
      const k = v.tech_id ?? "unassigned";
      m[k] ??= { visits: 0, minutes: 0 };
      m[k].visits += 1;
      m[k].minutes += v.minutes_on_site ?? 0;
    }
    return Object.entries(m)
      .map(([id, d]) => ({
        name: staff.find((s) => s.id === id)?.full_name ?? "Unassigned",
        ...d,
        avg: d.visits ? Math.round(d.minutes / d.visits) : 0,
      }))
      .sort((a, b) => b.visits - a.visits);
  }, [completed, staff]);

  const weekly = useMemo(() => {
    const m: Record<string, number> = {};
    for (const v of completed) {
      const d = new Date(v.scheduled_date);
      const key = `${d.getMonth() + 1}/${d.getDate()}`;
      m[key] = (m[key] ?? 0) + 1;
    }
    return Object.entries(m).slice(-14);
  }, [completed]);

  const peak = Math.max(1, ...weekly.map(([, n]) => n));

  return (
    <div className="space-y-4">
      <SectionTitle title="Reports" sub="Last 90 days of field operations" />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Visits completed" value={String(stats.completed)} />
        <StatTile label="Completion rate" value={`${stats.completionRate}%`} />
        <StatTile label="Avg time on site" value={`${stats.avgMinutes} min`} />
        {level === "owner" && <StatTile label="Chemical spend" value={money(stats.chemSpend)} />}
      </div>

      <div className="ss-card p-4">
        <div className="ss-label mb-3">Daily completed visits</div>
        {!weekly.length && <EmptyState>Not enough data.</EmptyState>}
        <div className="flex h-32 items-end gap-1.5">
          {weekly.map(([day, n]) => (
            <div key={day} className="flex flex-1 flex-col items-center gap-1">
              <div
                className="w-full rounded-t"
                style={{ height: `${(n / peak) * 100}%`, background: "hsl(var(--ss-burgundy))", minHeight: 3 }}
                title={`${day}: ${n}`}
              />
              <span className="ss-num text-[0.6rem] opacity-55">{day}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="ss-card p-4">
        <div className="ss-label mb-2">Technician performance</div>
        {!perTech.length && <EmptyState>No completed visits.</EmptyState>}
        <div className="space-y-1.5">
          {perTech.map((t) => (
            <div key={t.name} className="flex items-center justify-between text-[0.83rem]">
              <span>{t.name}</span>
              <span className="ss-num opacity-75">{t.visits} visits · {t.avg} min avg</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
