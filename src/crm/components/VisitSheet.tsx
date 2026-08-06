import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Camera, Check, Lock, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Chip } from "@/crm/components/Brand";
import { doseFor, evaluate, lsiVerdict, READING_FIELDS, statusFor, type MetricKey, type Readings } from "@/crm/lib/chem";
import { money2 } from "@/crm/lib/pricing";
import type { Stop } from "@/crm/pages/Route";

type Task = { id: string; label: string; is_required: boolean; photo_required: boolean };

export type VisitPhoto = { label: string; path: string; url: string };

const EVIDENCE_KINDS = [
  { tag: "water", label: "Pool water" },
  { tag: "equipment", label: "Equipment" },
  { tag: "filter", label: "Filter / pump" },
  { tag: "other", label: "Other" },
] as const;


async function compress(file: File, max = 1400, quality = 0.72): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((res) => canvas.toBlob((b) => res(b!), "image/jpeg", quality));
}

export default function VisitSheet({
  stop,
  onClose,
  onComplete,
}: {
  stop: Stop;
  onClose: () => void;
  onComplete: (stop: Stop) => void | Promise<void>;
}) {
  const [step, setStep] = useState(1);
  const [readings, setReadings] = useState<Readings>({});
  const [tasks, setTasks] = useState<Task[]>([]);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [taskPhotos, setTaskPhotos] = useState<Record<string, string>>({});
  const [before, setBefore] = useState<{ url: string; path: string } | null>(null);
  const [after, setAfter] = useState<{ url: string; path: string } | null>(null);
  const [evidence, setEvidence] = useState<VisitPhoto[]>([]);
  const [uploadingTag, setUploadingTag] = useState<string | null>(null);

  const [notes, setNotes] = useState("");
  const [issue, setIssue] = useState("");
  const [saving, setSaving] = useState(false);
  const startedAt = useRef(Date.now());

  const c = stop.ss_customers;
  const dose = useMemo(() => doseFor(readings, c.gallons), [readings, c.gallons]);
  const report = useMemo(() => evaluate(readings, c.gallons), [readings, c.gallons]);
  const verdict = lsiVerdict(dose.lsi);

  useEffect(() => {
    supabase
      .from("ss_workflow_tasks")
      .select("id,label,is_required,photo_required")
      .eq("customer_id", c.id)
      .order("sort_order")
      .then(({ data }) => setTasks(data ?? []));
    void supabase.from("ss_visits").update({ started_at: new Date().toISOString(), status: "in_progress" }).eq("id", stop.id);
  }, [c.id, stop.id]);

  const upload = useCallback(
    async (file: File, tag: string) => {
      const blob = await compress(file);
      const path = `${c.id}/${stop.id}-${tag}-${Date.now()}.jpg`;
      const { error } = await supabase.storage.from("service-photos").upload(path, blob, {
        contentType: "image/jpeg",
      });
      if (error) {
        toast.error("Photo upload failed");
        return null;
      }
      const { data } = await supabase.storage.from("service-photos").createSignedUrl(path, 60 * 60 * 24 * 365);
      return { url: data?.signedUrl ?? "", path };
    },
    [c.id, stop.id],
  );

  const blockingTasks = tasks.filter(
    (t) => (t.is_required && !checked[t.id]) || (t.photo_required && checked[t.id] && !taskPhotos[t.id]),
  );

  async function finish() {
    setSaving(true);
    const minutes = Math.max(1, Math.round((Date.now() - startedAt.current) / 60000));
    const checklist = tasks.map((t) => ({
      label: t.label,
      done: !!checked[t.id],
      photo: taskPhotos[t.id] ?? null,
    }));

    await supabase
      .from("ss_visits")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        minutes_on_site: minutes,
        readings: readings as never,
        dosing: { chlorine_oz: dose.chlorine_oz, acid_oz: dose.acid_oz, lsi: dose.lsi } as never,
        chem_cost: dose.cost,
        checklist: checklist as never,
        before_photo_url: before?.path ?? null,
        after_photo_url: after?.path ?? null,
        notes: notes || null,
        issue_reported: issue || null,
      })
      .eq("id", stop.id);

    await supabase.from("ss_feed").insert({
      customer_id: c.id,
      visit_id: stop.id,
      kind: "report",
      title: "Service complete ✅",
      body:
        `Free chlorine ${readings.fc ?? "—"} ppm · pH ${readings.ph ?? "—"}. ` +
        `${checklist.filter((t) => t.done).length} tasks completed in ${minutes} minutes.` +
        (notes ? ` ${notes}` : ""),
      sent_by_sms: true,
    });

    if (issue) {
      await supabase.from("ss_alerts").insert({
        customer_id: c.id,
        tech_id: stop.tech_id,
        priority: /leak|flow|electric/i.test(issue) ? "HIGH" : "MED",
        title: "Issue reported on visit",
        body: issue,
      });
    }

    if (c.email) {
      void supabase.functions.invoke("send-service-report", {
        body: {
          visitId: stop.id,
          email: c.email,
          name: c.full_name?.split(" ")[0] ?? "there",
          visitDate: new Date().toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
          }),
          address: [c.address, c.city].filter(Boolean).join(", ") || undefined,
          minutes,
          summary: report.summary,
          allGood: report.allGood,
          metrics: report.metrics
            .filter((m) => m.status !== "unknown")
            .map((m) => ({
              label: m.label,
              value: m.value,
              unit: m.unit,
              range: m.range,
              status: m.status,
              purpose: m.purpose,
            })),
          treatments: report.treatments.map((t) => ({
            chemical: t.chemical,
            amount: t.amount,
            reason: t.reason,
          })),
          tasksCompleted: checklist.filter((t) => t.done).length,
          notes: notes || undefined,
        },
      });
    }

    void supabase.functions.invoke("send-sms", {
      body: {
        to: c.phone,
        message: `Savvy Swim: service complete at ${c.address}. Your full report is in your portal.`,
      },
    });

    setSaving(false);
    toast.success(`Visit complete · ${minutes} min on site`);
    void onComplete(stop);
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div
        className="relative flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-[18px] sm:rounded-[18px]"
        style={{ background: "hsl(var(--ss-cream))" }}
      >
        <div className="ss-hero rounded-none p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="ss-tag" style={{ color: "rgba(255,255,255,.7)", fontSize: "0.52rem" }}>
                Step {step} of 3 · {["Readings", "Workflow", "Wrap-up"][step - 1]}
              </div>
              <div className="text-[1.05rem] font-semibold leading-tight">{c.full_name}</div>
              <div className="text-[0.74rem] opacity-80">
                {c.address} · {c.gallons.toLocaleString()} gal
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {c.gate_code && (
                  <span className="ss-chip" style={{ background: "hsl(var(--ss-gold))", color: "#3a2a05" }}>
                    <Lock size={9} /> Gate {c.gate_code}
                  </span>
                )}
                {Object.entries(c.custom_fields ?? {})
                  .filter(([, v]) => v === true)
                  .map(([k]) => (
                    <span key={k} className="ss-chip" style={{ background: "rgba(255,255,255,.2)", color: "#fff" }}>
                      {k}
                    </span>
                  ))}
              </div>
            </div>
            <button onClick={onClose} aria-label="Close visit">
              <X size={18} color="#fff" />
            </button>
          </div>
          <div className="mt-3 flex gap-1">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="h-1 flex-1 rounded-full"
                style={{ background: n <= step ? "#fff" : "rgba(255,255,255,.28)" }}
              />
            ))}
          </div>
        </div>

        {c.internal_notes && (
          <div
            className="px-4 py-2 text-[0.74rem]"
            style={{ background: "hsl(var(--ss-gold) / .2)", color: "hsl(35 78% 26%)" }}
          >
            <strong>STAFF NOTE</strong> · {c.internal_notes}
          </div>
        )}

        <div className="savvy-crm flex-1 overflow-y-auto p-4" style={{ minHeight: 0 }}>
          {step === 1 && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2.5">
                {READING_FIELDS.map((f) => {
                  const st = f.key === "temp" ? "unknown" : statusFor(f.key as MetricKey, (readings as Record<string, number | undefined>)[f.key]);
                  return (
                  <div key={f.key}>
                    <label className="ss-label flex items-center justify-between gap-1">
                      <span>
                        {f.label} <span className="opacity-50">{f.target}</span>
                      </span>
                      {st !== "unknown" && (
                        <span
                          className="rounded-full px-1.5 py-0.5 text-[0.55rem] font-semibold uppercase tracking-wide"
                          style={
                            st === "good"
                              ? { background: "hsl(152 55% 90%)", color: "hsl(152 60% 24%)" }
                              : { background: "hsl(var(--ss-burgundy) / .12)", color: "hsl(var(--ss-burgundy))" }
                          }
                        >
                          {st === "good" ? "OK" : st}
                        </span>
                      )}
                    </label>
                    <input
                      className="ss-input ss-num"
                      type="number"
                      step={f.step}
                      inputMode="decimal"
                      value={(readings as Record<string, number | undefined>)[f.key] ?? ""}
                      onChange={(e) =>
                        setReadings((r) => ({
                          ...r,
                          [f.key]: e.target.value === "" ? undefined : Number(e.target.value),
                        }))
                      }
                    />
                  </div>
                  );
                })}
              </div>

              <div className="ss-hero p-3.5">
                <div className="ss-tag" style={{ color: "rgba(255,255,255,.7)", fontSize: "0.52rem" }}>
                  Live dose
                </div>
                <div className="mt-2 grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-[0.68rem] opacity-75">Chlorine 12.5%</div>
                    <div className="ss-num text-[1.5rem] font-bold leading-none">{dose.chlorine_oz} oz</div>
                  </div>
                  <div>
                    <div className="text-[0.68rem] opacity-75">Muriatic acid</div>
                    <div className="ss-num text-[1.5rem] font-bold leading-none">{dose.acid_oz} oz</div>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between border-t pt-2 text-[0.75rem]" style={{ borderColor: "rgba(255,255,255,.2)" }}>
                  <span>
                    LSI <strong className="ss-num">{dose.lsi ?? "—"}</strong> · {verdict.label}
                  </span>
                  <span className="ss-num">Chem cost {money2(dose.cost)}</span>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-2">
              {!tasks.length && <p className="text-[0.85rem] opacity-60">No workflow tasks configured.</p>}
              {tasks.map((t) => (
                <div key={t.id} className="ss-card p-3">
                  <label className="flex items-start gap-2.5">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={!!checked[t.id]}
                      onChange={(e) => setChecked((s) => ({ ...s, [t.id]: e.target.checked }))}
                    />
                    <span className="flex-1 text-[0.87rem]">
                      {t.label}
                      <span className="ml-1.5 inline-flex gap-1 align-middle">
                        {t.is_required && <Chip tone="burgundy">Required</Chip>}
                        {t.photo_required && <Chip tone="aqua">Photo</Chip>}
                      </span>
                    </span>
                  </label>
                  {t.photo_required && checked[t.id] && (
                    <label className="ss-btn ss-btn-ghost mt-2 w-full cursor-pointer">
                      <Camera size={13} />
                      {taskPhotos[t.id] ? "Photo attached ✓" : "Capture photo"}
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={async (e) => {
                          const f = e.target.files?.[0];
                          if (!f) return;
                          const up = await upload(f, `task-${t.id}`);
                          if (up) setTaskPhotos((s) => ({ ...s, [t.id]: up.path }));
                        }}
                      />
                    </label>
                  )}
                </div>
              ))}
              {!!blockingTasks.length && (
                <div className="ss-card p-3 text-[0.78rem]" style={{ borderColor: "hsl(var(--ss-orange) / .4)" }}>
                  <AlertTriangle size={13} className="mr-1 inline" style={{ color: "hsl(var(--ss-orange))" }} />
                  {blockingTasks.length} required item{blockingTasks.length > 1 ? "s" : ""} still open.
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2.5">
                <PhotoTile label="Before" tone="#1C2A33" value={before} onPick={async (f) => setBefore(await upload(f, "before"))} />
                <PhotoTile label="After" tone="#8E1F2C" value={after} onPick={async (f) => setAfter(await upload(f, "after"))} />
              </div>
              <div>
                <label className="ss-label">Visit notes (shared with customer)</label>
                <textarea className="ss-input" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
              <div>
                <label className="ss-label">Report an issue (creates an alert)</label>
                <textarea
                  className="ss-input"
                  rows={2}
                  placeholder="Leak, flow problem, electrical, equipment…"
                  value={issue}
                  onChange={(e) => setIssue(e.target.value)}
                />
              </div>
              <div className="ss-card p-3">
                <div className="ss-tag" style={{ fontSize: "0.55rem" }}>
                  Water report
                </div>
                <p className="mt-1 text-[0.82rem] font-semibold">{report.summary}</p>
                <div className="mt-2 space-y-1">
                  {report.tested.map((m) => (
                    <div key={m.key} className="flex items-center justify-between gap-2 text-[0.76rem]">
                      <span className="opacity-75">
                        {m.label} <span className="opacity-50">({m.range})</span>
                      </span>
                      <span
                        className="ss-num font-semibold"
                        style={{
                          color:
                            m.status === "good" ? "hsl(152 60% 28%)" : "hsl(var(--ss-burgundy))",
                        }}
                      >
                        {m.value}
                        {m.unit ? ` ${m.unit}` : ""} · {m.status === "good" ? "in range" : m.status}
                      </span>
                    </div>
                  ))}
                  {!report.tested.length && <p className="text-[0.76rem] opacity-60">No readings entered yet.</p>}
                </div>
                {!!report.treatments.length && (
                  <div className="mt-3 border-t pt-2" style={{ borderColor: "hsl(var(--ss-sand))" }}>
                    <div className="ss-tag" style={{ fontSize: "0.55rem" }}>
                      Add these chemicals
                    </div>
                    {report.treatments.map((t) => (
                      <div key={t.metric} className="mt-1.5 text-[0.78rem]">
                        <strong>
                          {t.chemical} — {t.amount}
                        </strong>
                        <div className="opacity-65">{t.reason}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="ss-card p-3 text-[0.78rem] opacity-75">
                Time on site is captured automatically and this report is emailed to the customer
                when you complete the visit.
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2 border-t p-3" style={{ borderColor: "hsl(var(--ss-sand))", background: "hsl(var(--ss-white))" }}>
          {step > 1 && (
            <button className="ss-btn ss-btn-ghost" onClick={() => setStep((s) => s - 1)}>
              Back
            </button>
          )}
          {step < 3 ? (
            <button
              className="ss-btn flex-1"
              disabled={step === 2 && blockingTasks.length > 0}
              onClick={() => setStep((s) => s + 1)}
            >
              Continue
            </button>
          ) : (
            <button className="ss-btn flex-1" disabled={saving} onClick={finish}>
              <Check size={14} /> {saving ? "Saving…" : "Complete visit"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function PhotoTile({
  label,
  tone,
  value,
  onPick,
}: {
  label: string;
  tone: string;
  value: { url: string } | null;
  onPick: (f: File) => void | Promise<void>;
}) {
  return (
    <label
      className="ss-card relative flex aspect-square cursor-pointer items-center justify-center overflow-hidden"
      style={{ borderStyle: value ? "solid" : "dashed" }}
    >
      {value?.url ? (
        <img src={value.url} alt={`${label} service`} className="h-full w-full object-cover" />
      ) : (
        <span className="flex flex-col items-center gap-1 opacity-55">
          <Camera size={20} />
          <span className="ss-tag" style={{ fontSize: "0.55rem" }}>
            {label}
          </span>
        </span>
      )}
      <span
        className="ss-chip absolute left-1.5 top-1.5"
        style={{ background: tone, color: "#fff", borderColor: tone }}
      >
        {label}
      </span>
      <input
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void onPick(f);
        }}
      />
    </label>
  );
}
