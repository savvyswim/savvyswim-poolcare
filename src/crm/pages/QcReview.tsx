import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, ClipboardCheck, Droplets, Timer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Chip, EmptyState, SectionTitle, StatTile } from "@/crm/components/Brand";
import { useSavvyIdentity, useTable } from "@/crm/lib/useSavvy";
import {
  QC_CRITERIA,
  qcAverage,
  qcCategoryAverages,
  qcFailedItems,
  scoreTone,
  weekRange,
  weekStart,
  type QcNotes,
  type QcScores,
} from "@/crm/lib/qcScorecard";

type Staff = { id: string; full_name: string; level: string };

type Review = {
  id: string;
  tech_id: string;
  week_of: string;
  reviewer_name: string | null;
  scores: QcScores;
  notes: QcNotes;
  average_score: number | null;
  items_failed: number;
  top_strength: string | null;
  development_area: string | null;
  action_required: string | null;
  signed_off_by: string | null;
  signed_off_at: string | null;
  pools_reviewed: number | null;
};

type VisitRow = {
  id: string;
  scheduled_date: string;
  minutes_on_site: number | null;
  readings: Record<string, number | null> | null;
  checklist: Record<string, boolean> | null;
  photos: unknown;
  ss_customers: { full_name: string; city: string | null } | null;
};

const RATING = [1, 2, 3, 4, 5];

const checklistDone = (v: { checklist: Record<string, boolean> | null }) => {
  const c = v.checklist;
  if (!c || typeof c !== "object") return null;
  const vals = Object.values(c);
  if (!vals.length) return null;
  return vals.filter(Boolean).length;
};

export default function QcReview() {
  const id = useSavvyIdentity();
  const [techId, setTechId] = useState<string>("");
  const [week, setWeek] = useState<string>(weekStart());
  const [scores, setScores] = useState<QcScores>({});
  const [notes, setNotes] = useState<QcNotes>({});
  const [summary, setSummary] = useState({ top_strength: "", development_area: "", action_required: "" });
  const [signed, setSigned] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const { rows: staff } = useTable<Staff>("qc-staff", async () => {
    const { data } = await supabase
      .from("ss_staff")
      .select("id,full_name,level")
      .eq("is_active", true)
      .order("full_name");
    return (data ?? []) as Staff[];
  });

  const techs = useMemo(
    () => staff.filter((s) => s.level === "technician" || s.level === "contractor"),
    [staff],
  );

  useEffect(() => {
    if (!techId && techs.length) setTechId(techs[0].id);
  }, [techs, techId]);

  const range = useMemo(() => weekRange(week), [week]);

  const { rows: visits, loading: visitsLoading } = useTable<VisitRow>(
    "qc-visits",
    async () => {
      if (!techId) return [];
      const { data } = await supabase
        .from("ss_visits")
        .select("id,scheduled_date,minutes_on_site,readings,checklist,photos,ss_customers(full_name,city)")
        .eq("tech_id", techId)
        .eq("status", "completed")
        .gte("scheduled_date", range.start)
        .lte("scheduled_date", range.end)
        .order("scheduled_date");
      return (data ?? []) as unknown as VisitRow[];
    },
    [techId, range.start, range.end],
  );

  const { rows: reviews, refetch: reloadReviews } = useTable<Review>(
    "qc-reviews",
    async () => {
      const { data } = await supabase
        .from("ss_qc_reviews")
        .select("*")
        .order("week_of", { ascending: false })
        .limit(200);
      return (data ?? []) as unknown as Review[];
    },
    [],
  );

  const existing = useMemo(
    () => reviews.find((r) => r.tech_id === techId && r.week_of === week) ?? null,
    [reviews, techId, week],
  );

  useEffect(() => {
    setScores((existing?.scores as QcScores) ?? {});
    setNotes((existing?.notes as QcNotes) ?? {});
    setSummary({
      top_strength: existing?.top_strength ?? "",
      development_area: existing?.development_area ?? "",
      action_required: existing?.action_required ?? "",
    });
    setSigned(existing?.signed_off_by ?? null);
  }, [existing]);

  const avg = qcAverage(scores);
  const failed = qcFailedItems(scores);
  const rated = Object.values(scores).filter((v) => v > 0).length;
  const catAvgs = qcCategoryAverages(scores);
  const photoCount = visits.filter((v) => Array.isArray(v.photos) && (v.photos as unknown[]).length > 0).length;

  const save = async (signOff = false) => {
    if (!techId) return;
    setSaving(true);
    try {
      const payload = {
        tech_id: techId,
        week_of: week,
        reviewer_id: id.staffId,
        reviewer_name: id.staffName,
        scores,
        notes,
        average_score: avg,
        items_failed: failed.length,
        top_strength: summary.top_strength || null,
        development_area: summary.development_area || null,
        action_required: summary.action_required || null,
        pools_reviewed: visits.length,
        ...(signOff
          ? { signed_off_by: id.staffName ?? "Manager", signed_off_at: new Date().toISOString() }
          : {}),
      };
      const { error } = await supabase
        .from("ss_qc_reviews")
        .upsert(payload as never, { onConflict: "tech_id,week_of" });
      if (error) throw error;
      toast.success(signOff ? "Review signed off" : "Review saved");
      await reloadReviews();
    } catch (err: any) {
      toast.error(err?.message ?? "Could not save this review");
    } finally {
      setSaving(false);
    }
  };

  if (!id.isOffice) {
    return <EmptyState>Weekly QC reviews are for owners and service managers.</EmptyState>;
  }

  const techName = techs.find((t) => t.id === techId)?.full_name ?? "—";

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Weekly QC Review"
        sub="Service manager scorecard — hold the standard, protect the brand."
        right={
          <div className="flex flex-wrap items-center gap-2">
            <select className="ss-input" value={techId} onChange={(e) => setTechId(e.target.value)}>
              {techs.length === 0 && <option value="">No technicians</option>}
              {techs.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.full_name}
                </option>
              ))}
            </select>
            <input type="date" className="ss-input" value={week} onChange={(e) => setWeek(weekStart(new Date(`${e.target.value}T12:00:00`)))} />
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <StatTile tone="hero" label="Overall score" value={avg == null ? "—" : `${avg.toFixed(2)} / 5`} />
        <StatTile label="Items rated" value={`${rated} / ${QC_CRITERIA.length}`} />
        <StatTile label="Items failed" value={String(failed.length)} />
        <StatTile label="Pools this week" value={String(visits.length)} />
      </div>

      {existing?.signed_off_at && (
        <div className="ss-card flex items-center gap-2 p-3 text-[0.8rem]">
          <CheckCircle2 size={16} style={{ color: "hsl(var(--ss-green))" }} />
          Signed off by {existing.signed_off_by} on{" "}
          {new Date(existing.signed_off_at).toLocaleDateString()}
        </div>
      )}

      {/* Pools completed this week */}
      <div>
        <SectionTitle
          title="Pools serviced this week"
          sub={`${techName} · ${new Date(`${range.start}T12:00:00`).toLocaleDateString()} – ${new Date(`${range.end}T12:00:00`).toLocaleDateString()} · ${photoCount} stops with photos`}
        />
        {visitsLoading ? (
          <EmptyState>Loading stops…</EmptyState>
        ) : visits.length === 0 ? (
          <EmptyState>No completed stops for this tech in that week.</EmptyState>
        ) : (
          <div className="space-y-1.5">
            {visits.map((v) => (
              <div key={v.id} className="ss-card flex flex-wrap items-center gap-x-3 gap-y-1 p-2.5">
                <div className="min-w-[9rem] flex-1">
                  <div className="text-[0.85rem] font-semibold">{v.ss_customers?.full_name ?? "Pool"}</div>
                  <div className="text-[0.7rem] opacity-60">
                    {new Date(`${v.scheduled_date}T12:00:00`).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                    {v.ss_customers?.city ? ` · ${v.ss_customers.city}` : ""}
                  </div>
                </div>
                <div className="flex items-center gap-1 text-[0.78rem]">
                  <Timer size={13} className="opacity-50" />
                  <span className="ss-num font-bold">{v.minutes_on_site == null ? "—" : `${v.minutes_on_site}m`}</span>
                </div>
                <div className="flex items-center gap-1 text-[0.78rem]">
                  <Droplets size={13} className="opacity-50" />
                  <span className="ss-num">
                    pH {v.readings?.["ph"] ?? "—"} · Cl {v.readings?.["chlorine"] ?? "—"}
                  </span>
                </div>
                <Chip tone={checklistDone(v) === null ? "ink" : checklistDone(v)! >= 15 ? "green" : "gold"}>
                  {checklistDone(v) === null ? "no checklist" : `${checklistDone(v)}/15 checklist`}
                </Chip>
                <Chip tone={Array.isArray(v.photos) && (v.photos as unknown[]).length ? "green" : "gold"}>
                  {Array.isArray(v.photos) && (v.photos as unknown[]).length
                    ? `${(v.photos as unknown[]).length} photos`
                    : "no photos"}
                </Chip>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Scorecard */}
      <div>
        <SectionTitle title="Performance scorecard" sub="Rate 1–5. Anything under 3 is a fail and must be addressed this week." />
        <div className="space-y-1.5">
          {QC_CRITERIA.map((c) => {
            const v = scores[String(c.n)] ?? 0;
            const fail = v > 0 && v < 3;
            return (
              <div
                key={c.n}
                className="ss-card p-2.5"
                style={fail ? { background: "hsl(var(--ss-orange) / 0.1)", borderColor: "hsl(var(--ss-orange) / 0.45)" } : undefined}
              >
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <div className="min-w-[13rem] flex-1">
                    <div className="text-[0.85rem] font-semibold">
                      <span className="ss-num opacity-40">{String(c.n).padStart(2, "0")} </span>
                      {c.label}
                    </div>
                    <div className="text-[0.66rem] uppercase tracking-wide opacity-55">{c.category}</div>
                  </div>
                  <div className="flex gap-1">
                    {RATING.map((r) => (
                      <button
                        key={r}
                        onClick={() => setScores((s) => ({ ...s, [c.n]: s[String(c.n)] === r ? 0 : r }))}
                        className={`ss-chip ss-num ${v === r ? "opacity-100" : "opacity-45"}`}
                        style={
                          v === r
                            ? {
                                background: r < 3 ? "hsl(var(--ss-orange) / 0.2)" : "hsl(var(--ss-green) / 0.16)",
                                borderColor: r < 3 ? "hsl(var(--ss-orange) / 0.5)" : "hsl(var(--ss-green) / 0.4)",
                              }
                            : undefined
                        }
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                  <Chip tone={v === 0 ? "ink" : fail ? "orange" : "green"}>
                    {v === 0 ? "not rated" : fail ? "fail" : "pass"}
                  </Chip>
                  <input
                    className="ss-input w-full md:w-56"
                    placeholder="Notes"
                    value={notes[String(c.n)] ?? ""}
                    onChange={(e) => setNotes((n) => ({ ...n, [c.n]: e.target.value }))}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {catAvgs.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {catAvgs.map((c) => (
            <Chip key={c.category} tone={scoreTone(c.avg)}>
              {c.category}: {c.avg.toFixed(1)}
            </Chip>
          ))}
        </div>
      )}

      {/* Summary */}
      <div>
        <SectionTitle title="Weekly summary & action plan" />
        <div className="ss-card space-y-2 p-3">
          {failed.length > 0 && (
            <div className="text-[0.78rem]" style={{ color: "hsl(27 86% 38%)" }}>
              <strong>{failed.length}</strong> failed item{failed.length === 1 ? "" : "s"}:{" "}
              {failed.map((f) => f.label).join(" · ")}
            </div>
          )}
          {(["top_strength", "development_area", "action_required"] as const).map((k) => (
            <label key={k} className="block">
              <div className="ss-tag" style={{ fontSize: "0.58rem" }}>
                {k === "top_strength" ? "Top strength" : k === "development_area" ? "Primary development area" : "Action required by next review"}
              </div>
              <textarea
                className="ss-input mt-1 w-full"
                rows={2}
                value={summary[k]}
                onChange={(e) => setSummary((s) => ({ ...s, [k]: e.target.value }))}
              />
            </label>
          ))}
          <div className="flex flex-wrap gap-2 pt-1">
            <button className="ss-btn" disabled={saving || !techId} onClick={() => save(false)}>
              {saving ? "Saving…" : "Save review"}
            </button>
            <button className="ss-btn ss-btn-ghost" disabled={saving || !techId} onClick={() => save(true)}>
              <ClipboardCheck size={14} className="mr-1 inline" />
              {signed ? "Re-sign off" : "Manager sign-off"}
            </button>
          </div>
        </div>
      </div>

      {/* History */}
      <div>
        <SectionTitle title="Review history" sub="Every weekly review across the team." />
        {reviews.length === 0 ? (
          <EmptyState>No reviews recorded yet.</EmptyState>
        ) : (
          <div className="space-y-1.5">
            {reviews.map((r) => (
              <button
                key={r.id}
                onClick={() => {
                  setTechId(r.tech_id);
                  setWeek(r.week_of);
                }}
                className="ss-card flex w-full flex-wrap items-center gap-x-3 gap-y-1 p-2.5 text-left"
              >
                <div className="min-w-[9rem] flex-1 text-[0.85rem] font-semibold">
                  {staff.find((s) => s.id === r.tech_id)?.full_name ?? "Tech"}
                </div>
                <div className="text-[0.72rem] opacity-60">
                  Week of {new Date(`${r.week_of}T12:00:00`).toLocaleDateString()}
                </div>
                <Chip tone={scoreTone(r.average_score)}>{r.average_score == null ? "—" : `${Number(r.average_score).toFixed(2)} / 5`}</Chip>
                {r.items_failed > 0 && <Chip tone="orange">{r.items_failed} failed</Chip>}
                {r.pools_reviewed != null && <Chip tone="ink">{r.pools_reviewed} pools</Chip>}
                {r.signed_off_at && <Chip tone="green">signed</Chip>}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
