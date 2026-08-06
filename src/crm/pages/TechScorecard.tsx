import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Timer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Chip, EmptyState, SectionTitle, StatTile } from "@/crm/components/Brand";
import { useSavvyIdentity, useTable } from "@/crm/lib/useSavvy";
import {
  minutesOnSite,
  scoreByTech,
  standardFor,
  verdictFor,
  VERDICT_LABEL,
  VERDICT_TONE,
  type ScoredVisit,
  type TimeStandard,
} from "@/crm/lib/timeStandards";

type VisitRow = {
  id: string;
  scheduled_date: string;
  tech_id: string | null;
  minutes_on_site: number | null;
  arrived_at: string | null;
  completed_at: string | null;
  ss_customers: { full_name: string; city: string | null; gallons: number | null; pool_type: string | null } | null;
};

type Staff = { id: string; full_name: string; level: string };

const RANGES = [
  { days: 7, label: "7 days" },
  { days: 30, label: "30 days" },
  { days: 90, label: "90 days" },
];

const fmtGal = (g: number | null) => (g == null ? "—" : `${(g / 1000).toFixed(g >= 10000 ? 0 : 1)}k gal`);

export default function TechScorecard() {
  const id = useSavvyIdentity();
  const canManage = id.isOffice;
  const [days, setDays] = useState(30);
  const [techFilter, setTechFilter] = useState<string>("all");
  const [onlyShort, setOnlyShort] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, Partial<TimeStandard>>>({});

  const { rows: standards, refetch: reloadStandards } = useTable<TimeStandard>("time-standards", async () => {
    const { data } = await supabase
      .from("ss_time_standards")
      .select("*")
      .order("sort_order");
    return (data ?? []) as TimeStandard[];
  });

  const { rows: staff } = useTable<Staff>("scorecard-staff", async () => {
    const { data } = await supabase.from("ss_staff").select("id,full_name,level").eq("is_active", true).order("full_name");
    return (data ?? []) as Staff[];
  });

  const since = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString().slice(0, 10);
  }, [days]);

  const { rows: visits, loading } = useTable<VisitRow>(
    "scorecard-visits",
    async () => {
      const { data } = await supabase
        .from("ss_visits")
        .select("id,scheduled_date,tech_id,minutes_on_site,arrived_at,completed_at,ss_customers(full_name,city,gallons,pool_type)")
        .eq("status", "completed")
        .gte("scheduled_date", since)
        .order("scheduled_date", { ascending: false })
        .limit(500);
      return (data ?? []) as unknown as VisitRow[];
    },
    [since],
  );

  const techName = (tid: string | null) => staff.find((s) => s.id === tid)?.full_name ?? "Unassigned";

  const scored: ScoredVisit[] = useMemo(
    () =>
      visits.map((v) => {
        const std = standardFor(standards, v.ss_customers?.gallons ?? null, v.ss_customers?.pool_type);
        const minutes = minutesOnSite(v);
        const verdict = verdictFor(minutes, std);
        return {
          id: v.id,
          scheduled_date: v.scheduled_date,
          customer_name: v.ss_customers?.full_name ?? "Pool",
          city: v.ss_customers?.city ?? null,
          gallons: v.ss_customers?.gallons ?? null,
          tech_id: v.tech_id,
          tech_name: techName(v.tech_id),
          minutes,
          standard: std,
          verdict,
          shortBy: std && minutes != null ? Math.max(0, std.target_min_minutes - minutes) : 0,
        };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [visits, standards, staff],
  );

  const filtered = scored.filter(
    (v) => (techFilter === "all" || v.tech_id === techFilter) && (!onlyShort || v.verdict === "short"),
  );

  const scores = useMemo(() => scoreByTech(scored), [scored]);
  const shortCount = scored.filter((v) => v.verdict === "short").length;
  const timed = scored.filter((v) => v.minutes != null);
  const avgAll = timed.length ? Math.round(timed.reduce((a, v) => a + (v.minutes ?? 0), 0) / timed.length) : null;

  const saveStandard = async (s: TimeStandard) => {
    const patch = draft[s.id];
    if (!patch) return;
    setSavingId(s.id);
    try {
      const { error } = await supabase.from("ss_time_standards").update(patch as never).eq("id", s.id);
      if (error) throw error;
      setDraft((d) => {
        const next = { ...d };
        delete next[s.id];
        return next;
      });
      toast.success(`${s.label} target saved`);
      await reloadStandards();
    } catch (err: any) {
      toast.error(err?.message ?? "Could not save that target");
    } finally {
      setSavingId(null);
    }
  };

  if (!canManage) {
    return <EmptyState>Tech scorecards are visible to owners and office managers.</EmptyState>;
  }

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Tech Scorecard"
        sub="Time at pool vs. the target window for each pool size. Short visits are flagged for review."
        right={
          <div className="flex gap-1">
            {RANGES.map((r) => (
              <button
                key={r.days}
                onClick={() => setDays(r.days)}
                className={`ss-chip ${days === r.days ? "opacity-100" : "opacity-50"}`}
              >
                {r.label}
              </button>
            ))}
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <StatTile tone="hero" label="Completed visits" value={String(scored.length)} />
        <StatTile label="Avg time at pool" value={avgAll == null ? "—" : `${avgAll} min`} />
        <StatTile label="Under target" value={String(shortCount)} />
        <StatTile
          label="Fleet score"
          value={`${timed.length ? Math.round(((timed.length - shortCount) / timed.length) * 100) : 0}%`}
        />
      </div>

      {shortCount > 0 && (
        <div
          className="ss-card flex items-start gap-3 p-3"
          style={{ background: "hsl(var(--ss-gold) / 0.14)", borderColor: "hsl(var(--ss-gold) / 0.5)" }}
        >
          <AlertTriangle size={18} style={{ color: "hsl(35 78% 38%)" }} className="mt-0.5 shrink-0" />
          <div className="text-[0.8rem]">
            <strong>{shortCount}</strong> visit{shortCount === 1 ? "" : "s"} came in under the target time for that pool
            size. Review the flagged stops below before payroll.
          </div>
        </div>
      )}

      {/* Per-tech KPI */}
      <div>
        <SectionTitle title="KPI by technician" sub="Score = share of timed visits that met or beat the target window." />
        {scores.length === 0 ? (
          <EmptyState>No completed visits in this window yet.</EmptyState>
        ) : (
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {scores.map((t) => (
              <button
                key={t.tech_id}
                onClick={() => setTechFilter(techFilter === t.tech_id ? "all" : t.tech_id)}
                className={`ss-card p-3 text-left ${techFilter === t.tech_id ? "ring-2" : ""}`}
                style={techFilter === t.tech_id ? { boxShadow: "0 0 0 2px hsl(var(--ss-burgundy) / 0.4)" } : undefined}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <div className="text-[0.9rem] font-semibold">{t.tech_name}</div>
                  <div className="ss-num text-[1.4rem] font-bold leading-none">{t.score}%</div>
                </div>
                <div className="mt-2 h-1.5 w-full rounded-full" style={{ background: "hsl(var(--ss-ink) / 0.1)" }}>
                  <div
                    className="h-1.5 rounded-full"
                    style={{
                      width: `${t.score}%`,
                      background:
                        t.score >= 85 ? "hsl(var(--ss-green))" : t.score >= 65 ? "hsl(var(--ss-gold))" : "hsl(var(--ss-burgundy))",
                    }}
                  />
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  <Chip tone="ink">{t.visits} visits</Chip>
                  <Chip tone="aqua">{t.avgMinutes == null ? "—" : `${t.avgMinutes} min avg`}</Chip>
                  {t.short > 0 && <Chip tone="gold">{t.short} under</Chip>}
                  {t.onTarget > 0 && <Chip tone="green">{t.onTarget} on target</Chip>}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Visit log */}
      <div>
        <SectionTitle
          title="Time at pool — visit log"
          sub={techFilter === "all" ? "All technicians" : techName(techFilter)}
          right={
            <div className="flex items-center gap-2">
              {techFilter !== "all" && (
                <button className="ss-chip" onClick={() => setTechFilter("all")}>
                  Clear tech
                </button>
              )}
              <button className={`ss-chip ${onlyShort ? "opacity-100" : "opacity-50"}`} onClick={() => setOnlyShort((v) => !v)}>
                Only under target
              </button>
            </div>
          }
        />
        {loading ? (
          <EmptyState>Loading visits…</EmptyState>
        ) : filtered.length === 0 ? (
          <EmptyState>No visits match this filter.</EmptyState>
        ) : (
          <div className="space-y-1.5">
            {filtered.slice(0, 120).map((v) => (
              <div
                key={v.id}
                className="ss-card flex flex-wrap items-center gap-x-3 gap-y-1 p-2.5"
                style={
                  v.verdict === "short"
                    ? { background: "hsl(var(--ss-gold) / 0.12)", borderColor: "hsl(var(--ss-gold) / 0.5)" }
                    : undefined
                }
              >
                <div className="min-w-[9rem] flex-1">
                  <div className="text-[0.85rem] font-semibold">{v.customer_name}</div>
                  <div className="text-[0.7rem] opacity-60">
                    {new Date(`${v.scheduled_date}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    {v.city ? ` · ${v.city}` : ""} · {fmtGal(v.gallons)}
                  </div>
                </div>
                <div className="text-[0.72rem] opacity-70">{v.tech_name}</div>
                <div className="flex items-center gap-1 text-[0.8rem]">
                  <Timer size={13} className="opacity-50" />
                  <span className="ss-num font-bold">{v.minutes == null ? "—" : `${v.minutes}m`}</span>
                  <span className="opacity-50">
                    {v.standard ? ` / ${v.standard.target_min_minutes}–${v.standard.target_max_minutes}m` : " / no size set"}
                  </span>
                </div>
                <Chip tone={VERDICT_TONE[v.verdict]}>
                  {v.verdict === "short" ? `${VERDICT_LABEL.short} by ${v.shortBy}m` : VERDICT_LABEL[v.verdict]}
                </Chip>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Standards editor */}
      <div>
        <SectionTitle title="Time standards by pool size" sub="Owners and office managers can tune these targets." />
        <div className="space-y-1.5">
          {standards.map((s) => {
            const d = { ...s, ...draft[s.id] } as TimeStandard;
            const dirty = !!draft[s.id];
            const set = (patch: Partial<TimeStandard>) =>
              setDraft((prev) => ({ ...prev, [s.id]: { ...prev[s.id], ...patch } }));
            return (
              <div key={s.id} className="ss-card p-3">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="min-w-[11rem] flex-1">
                    <div className="text-[0.85rem] font-semibold">{s.label}</div>
                    {s.notes && <div className="text-[0.7rem] opacity-60">{s.notes}</div>}
                  </div>
                  <label className="text-[0.68rem] uppercase tracking-wide opacity-60">
                    Target min
                    <input
                      type="number"
                      className="ss-input ml-2 w-16"
                      value={d.target_min_minutes}
                      onChange={(e) => set({ target_min_minutes: Number(e.target.value) })}
                    />
                  </label>
                  <label className="text-[0.68rem] uppercase tracking-wide opacity-60">
                    Target max
                    <input
                      type="number"
                      className="ss-input ml-2 w-16"
                      value={d.target_max_minutes}
                      onChange={(e) => set({ target_max_minutes: Number(e.target.value) })}
                    />
                  </label>
                  <label className="text-[0.68rem] uppercase tracking-wide opacity-60">
                    Max drive
                    <input
                      type="number"
                      className="ss-input ml-2 w-16"
                      value={d.max_drive_minutes}
                      onChange={(e) => set({ max_drive_minutes: Number(e.target.value) })}
                    />
                  </label>
                  <button
                    className="ss-btn"
                    disabled={!dirty || savingId === s.id}
                    onClick={() => saveStandard(s)}
                    style={!dirty ? { opacity: 0.4 } : undefined}
                  >
                    {savingId === s.id ? "Saving…" : "Save"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
