import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Camera, Check, Lock, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Chip } from "@/crm/components/Brand";
import { describeFlags, doseFor, evaluate, flagReadings, lsiVerdict, READING_FIELDS, severityFor, severityTone, statusFor, type MetricKey, type Readings } from "@/crm/lib/chem";
import {
  PHASE_LABEL,
  PHASE_ORDER,
  SIGNATURE_CHECKLIST,
  photoRuleFor,
  signaturePhase,

  type ChecklistPhoto,
  type WorkflowPhase,
} from "@/crm/lib/checklist";
import { money2 } from "@/crm/lib/pricing";
import { useWaterBodies } from "@/crm/lib/serviceConfig";
import ChemicalsAdded, {
  chemTotal,
  describeVariances,
  doseVariances,
  type AppliedChem,
} from "@/crm/components/ChemicalsAdded";
import InventoryUsed, { usedTotal, type UsedItem } from "@/crm/components/InventoryUsed";
import type { Stop } from "@/crm/pages/Route";

type Task = { id: string; label: string; is_required: boolean; photo_required: boolean; phase?: WorkflowPhase | null; hint?: string | null };

type TemplateStep = {
  id: string;
  label: string;
  hint: string | null;
  phase: WorkflowPhase;
  is_required: boolean;
  photo_required: boolean;
  sort_order: number;
};

type Step = {
  id: string;
  label: string;
  hint?: string | undefined;
  is_required: boolean;
  photo: ChecklistPhoto;
  custom: boolean;
  phase: WorkflowPhase;
};

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
  const [bodyReadings, setBodyReadings] = useState<Record<string, Readings>>({});
  const [activeBody, setActiveBody] = useState<string>("main");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [templateSteps, setTemplateSteps] = useState<TemplateStep[]>([]);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [taskPhotos, setTaskPhotos] = useState<Record<string, string[]>>({});
  const [before, setBefore] = useState<{ url: string; path: string } | null>(null);
  const [after, setAfter] = useState<{ url: string; path: string } | null>(null);
  const [evidence, setEvidence] = useState<VisitPhoto[]>([]);
  const [uploadingTag, setUploadingTag] = useState<string | null>(null);

  const [notes, setNotes] = useState("");
  const [issue, setIssue] = useState("");
  const [saving, setSaving] = useState(false);
  const startedAt = useRef(Date.now());

  const c = stop.ss_customers;
  const { rows: waterBodyRows } = useWaterBodies(c.id);

  /** Every property has at least one body of water — fall back to the pool on the customer record. */
  const bodies = useMemo(
    () =>
      waterBodyRows.length
        ? waterBodyRows.map((b) => ({ id: b.id, name: b.name, kind: b.kind, gallons: b.gallons || c.gallons }))
        : [{ id: "main", name: "Pool", kind: "pool", gallons: c.gallons }],
    [waterBodyRows, c.gallons],
  );

  useEffect(() => {
    if (!bodies.some((b) => b.id === activeBody)) setActiveBody(bodies[0]!.id);
  }, [bodies, activeBody]);

  const body = bodies.find((b) => b.id === activeBody) ?? bodies[0]!;
  const readings = bodyReadings[body.id] ?? {};
  const setReadings = useCallback(
    (fn: (r: Readings) => Readings) =>
      setBodyReadings((s) => ({ ...s, [body.id]: fn(s[body.id] ?? {}) })),
    [body.id],
  );

  const dose = useMemo(() => doseFor(readings, body.gallons), [readings, body.gallons]);
  const flags = useMemo(() => flagReadings(readings), [readings]);
  const report = useMemo(() => evaluate(readings, body.gallons), [readings, body.gallons]);
  const verdict = lsiVerdict(dose.lsi);

  /** One dose + report per body of water, so nothing is sized against the wrong volume. */
  const perBody = useMemo(
    () =>
      bodies.map((b) => {
        const r = bodyReadings[b.id] ?? {};
        return { ...b, readings: r, dose: doseFor(r, b.gallons), report: evaluate(r, b.gallons) };
      }),
    [bodies, bodyReadings],
  );
  /** Actual products poured, per body of water. */
  const [applied, setApplied] = useState<Record<string, AppliedChem[]>>({});
  /** Truck stock consumed on this stop — decremented from on-hand on save. */
  const [used, setUsed] = useState<UsedItem[]>([]);
  const loggedCost = useMemo(
    () => Object.values(applied).reduce((s, list) => s + chemTotal(list), 0),
    [applied],
  );
  const anyLogged = useMemo(() => Object.values(applied).some((l) => l.length), [applied]);
  // Logged quantities vs the dose the engine recommended, per body of water.
  const doseFlags = useMemo(
    () =>
      perBody.flatMap((b) =>
        doseVariances(applied[b.id] ?? [], { chlorine: b.dose.chlorine_oz, acid: b.dose.acid_oz })
          .filter((v) => v.severity !== "ok")
          .map((v) => ({ ...v, bodyName: b.name })),
      ),
    [perBody, applied],
  );
  const estimatedChemCost = perBody.reduce((sum, b) => sum + (b.dose.cost || 0), 0);
  const totalChemCost = anyLogged ? loggedCost : estimatedChemCost;

  useEffect(() => {
    supabase
      .from("ss_workflow_tasks")
      .select("id,label,is_required,photo_required,phase,hint")
      .eq("customer_id", c.id)
      .order("sort_order")
      .then(({ data }) => setTasks((data ?? []) as Task[]));

    /** Ordered workflow template: the one assigned to this pool, else the default. */
    void (async () => {
      const { data: cust } = await supabase
        .from("ss_customers")
        .select("workflow_template_id")
        .eq("id", c.id)
        .maybeSingle();
      const assigned = (cust as { workflow_template_id?: string | null } | null)?.workflow_template_id ?? null;
      let templateId = assigned;
      if (!templateId) {
        const { data: def } = await supabase
          .from("ss_workflow_templates")
          .select("id")
          .eq("is_default", true)
          .eq("is_active", true)
          .maybeSingle();
        templateId = def?.id ?? null;
      }
      if (!templateId) return;
      const { data: rows } = await supabase
        .from("ss_workflow_template_steps")
        .select("id,label,hint,phase,is_required,photo_required,sort_order")
        .eq("template_id", templateId)
        .order("sort_order");
      setTemplateSteps((rows ?? []) as TemplateStep[]);
    })();

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

  /** Template sequence (or the built-in signature list), then anything specific to this pool. */
  const steps: Step[] = useMemo(() => {
    const base: Step[] = templateSteps.length
      ? templateSteps.map((s) => ({
          id: s.id,
          label: s.label,
          hint: s.hint ?? undefined,
          is_required: s.is_required,
          photo: photoRuleFor(s.label),
          custom: false,
          phase: s.phase,
        }))
      : SIGNATURE_CHECKLIST.map((s) => ({
          id: s.id,
          label: s.label,
          hint: s.hint,
          is_required: s.is_required,
          photo: s.photo,
          custom: false,
          phase: signaturePhase(s.id),
        }));
    const custom: Step[] = tasks.map((t) => ({
      id: t.id,
      label: t.label,
      hint: t.hint ?? undefined,
      is_required: t.is_required,
      photo: photoRuleFor(t.label),
      custom: true,
      phase: (t.phase ?? "in_progress") as WorkflowPhase,
    }));
    const all = [...base, ...custom];
    return PHASE_ORDER.flatMap((p) => all.filter((s) => s.phase === p));
  }, [tasks, templateSteps]);

  const blockingTasks = steps.filter(
    (t) =>
      (t.is_required && !checked[t.id]) ||
      (t.photo === "required" && checked[t.id] && !(taskPhotos[t.id] ?? []).length),
  );

  const doneCount = steps.filter((t) => checked[t.id]).length;

  async function finish() {
    setSaving(true);
    const minutes = Math.max(1, Math.round((Date.now() - startedAt.current) / 60000));
    const checklist = steps.map((t) => ({
      label: t.label,
      done: !!checked[t.id],
      photo: taskPhotos[t.id]?.[0] ?? null,
      photos: taskPhotos[t.id] ?? [],
    }));



    const allPhotos: VisitPhoto[] = [
      ...(before ? [{ label: "Before", path: before.path, url: before.url }] : []),
      ...(after ? [{ label: "After", path: after.path, url: after.url }] : []),
      ...evidence,
    ];

    await supabase
      .from("ss_visits")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        minutes_on_site: minutes,
        water_body_id: body.id === "main" ? null : body.id,
        readings: readings as never,
        dosing: {
          chlorine_oz: dose.chlorine_oz,
          acid_oz: dose.acid_oz,
          lsi: dose.lsi,
          estimated_cost: estimatedChemCost,
          applied_cost: loggedCost,
          applied: perBody.flatMap((b) =>
            (applied[b.id] ?? []).map((a) => ({
              ...a,
              body_id: b.id === "main" ? null : b.id,
              body_name: b.name,
            })),
          ),
          bodies: perBody.map((b) => ({
            id: b.id === "main" ? null : b.id,
            name: b.name,
            kind: b.kind,
            gallons: b.gallons,
            readings: b.readings,
            chlorine_oz: b.dose.chlorine_oz,
            acid_oz: b.dose.acid_oz,
            lsi: b.dose.lsi,
            cost: b.dose.cost,
            applied: applied[b.id] ?? [],
            applied_cost: chemTotal(applied[b.id] ?? []),
            dose_variance: doseVariances(applied[b.id] ?? [], {
              chlorine: b.dose.chlorine_oz,
              acid: b.dose.acid_oz,
            }),
          })),
        } as never,
        chem_cost: totalChemCost,
        checklist: checklist as never,
        photos: allPhotos as never,
        before_photo_url: before?.path ?? null,
        after_photo_url: after?.path ?? null,

        notes: notes || null,
        issue_reported: issue || null,
      })
      .eq("id", stop.id);

    // Draw down on-hand stock for whatever was pulled off the truck here.
    const usedRows = used.filter((u) => u.qty > 0);
    if (usedRows.length) {
      const { error: invErr } = await supabase.rpc("ss_log_inventory_usage", {
        p_items: usedRows.map((u) => ({
          item_id: u.item_id,
          qty: u.qty,
          unit: u.entry_unit || u.unit,
          unit_cost: u.unit_cost,
        })),
        p_visit_id: stop.id,
        p_note: `Used on ${c.full_name}'s visit`,
      });
      if (invErr) toast.error(`Visit saved, inventory not updated: ${invErr.message}`);
    }

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

    // Chemistry outside Savvy Swim targets — flag it to the office.
    const chemFlags = perBody.flatMap((b) =>
      flagReadings(b.readings).map((f) => ({ ...f, bodyName: b.name })),
    );
    const doseVarianceLine = doseFlags.length
      ? doseFlags
          .map((v) => `${v.bodyName} — ${describeVariances([v])}`)
          .join(" | ")
      : "";
    const doseCritical = doseFlags.some((v) => v.severity === "critical");

    if (chemFlags.length) {
      const critical = chemFlags.filter((f) => f.severity === "critical");
      await supabase.from("ss_alerts").insert({
        customer_id: c.id,
        tech_id: stop.tech_id,
        priority: critical.length || doseCritical ? "HIGH" : "MED",
        title: critical.length
          ? `Chemistry out of range — ${c.full_name}`
          : `Chemistry watch — ${c.full_name}`,
        body:
          chemFlags
            .map((f) => `${f.bodyName}: ${describeFlags([f])}`)
            .join(" | ") +
          (doseVarianceLine ? ` || DOSE VARIANCE: ${doseVarianceLine}` : "") +
          (notes ? ` — ${notes}` : ""),
      });
    } else if (doseVarianceLine) {
      await supabase.from("ss_alerts").insert({
        customer_id: c.id,
        tech_id: stop.tech_id,
        priority: doseCritical ? "HIGH" : "MED",
        title: `Dose variance — ${c.full_name}`,
        body: `Logged quantities differ from the recommended dose. ${doseVarianceLine}` + (notes ? ` — ${notes}` : ""),
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
          photos: allPhotos.filter((p) => p.url).slice(0, 6).map((p) => ({ label: p.label, url: p.url })),
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
              <div className="ss-card p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="ss-tag" style={{ fontSize: "0.55rem" }}>
                    On arrival · before photo required
                  </div>
                  <Chip tone={before ? "aqua" : "burgundy"}>{before ? "Captured" : "Missing"}</Chip>
                </div>
                <p className="mt-0.5 text-[0.74rem] opacity-65">
                  Snap the pool the moment you arrive — before you touch anything. Step 1 stays locked until it&apos;s captured.
                </p>
                <div className="mt-2">
                  <PhotoTile
                    label="Before"
                    tone="#1C2A33"
                    wide
                    value={before}
                    onPick={async (f) => setBefore(await upload(f, "before"))}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-2">
                <div className="ss-tag" style={{ fontSize: "0.55rem" }}>
                  Step 1 · Water readings — {body.name}
                </div>
                <span className="ss-num text-[0.72rem] opacity-65">{body.gallons.toLocaleString()} gal</span>
              </div>
              {bodies.length > 1 && (
                <div className="flex flex-wrap gap-1.5">
                  {perBody.map((b) => {
                    const logged = Object.values(b.readings).some((v) => v !== undefined);
                    return (
                      <button
                        key={b.id}
                        className={`ss-btn ${b.id === body.id ? "" : "ss-btn-ghost"}`}
                        style={{ fontSize: "0.68rem", padding: "0.35rem 0.6rem" }}
                        onClick={() => setActiveBody(b.id)}
                      >
                        {b.name}
                        {logged ? " ✓" : ""}
                      </button>
                    );
                  })}
                </div>
              )}
              <div className="grid grid-cols-2 gap-2.5">
                {READING_FIELDS.map((f) => {
                  const raw = (readings as Record<string, number | undefined>)[f.key];
                  const sev = f.key === "temp" ? "unknown" : severityFor(f.key as MetricKey, raw);
                  const st = f.key === "temp" ? "unknown" : statusFor(f.key as MetricKey, raw);
                  const tone = severityTone(sev);
                  return (
                  <div key={f.key}>
                    <label className="ss-label flex items-center justify-between gap-1">
                      <span>
                        {f.label} <span className="opacity-50">{f.target}</span>
                      </span>
                      {sev !== "unknown" && (
                        <span
                          className="rounded-full px-1.5 py-0.5 text-[0.55rem] font-semibold uppercase tracking-wide"
                          style={{ background: tone.bg, color: tone.fg }}
                        >
                          {sev === "good" ? "OK" : sev === "critical" ? `${st} !` : st}
                        </span>
                      )}
                    </label>
                    <input
                      className="ss-input ss-num"
                      type="number"
                      step={f.step}
                      inputMode="decimal"
                      style={
                        sev === "watch" || sev === "critical"
                          ? {
                              borderColor: tone.border,
                              boxShadow: `inset 0 0 0 1px ${tone.border}`,
                              background: tone.bg,
                              color: tone.fg,
                              fontWeight: 700,
                            }
                          : sev === "good"
                            ? { borderColor: tone.border }
                            : undefined
                      }
                      value={raw ?? ""}
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

              {flags.length > 0 && (
                <div
                  className="p-3"
                  style={{
                    border: `1px solid ${severityTone(flags[0]!.severity).border}`,
                    background: severityTone(flags[0]!.severity).bg,
                  }}
                >
                  <div className="ss-tag" style={{ fontSize: "0.52rem", color: severityTone(flags[0]!.severity).fg }}>
                    {flags.some((f) => f.severity === "critical")
                      ? "Out of range — office will be alerted"
                      : "Watch levels — logged for the office"}
                  </div>
                  <ul className="mt-1.5 space-y-0.5 text-[0.72rem]">
                    {flags.map((f) => (
                      <li key={f.key} style={{ color: severityTone(f.severity).fg }}>
                        <strong>{f.label}</strong> {f.value}
                        {f.unit ? ` ${f.unit}` : ""} — {f.status} vs target {f.range}
                      </li>
                    ))}
                  </ul>
                </div>
              )}


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
              <div className="ss-card flex items-center justify-between gap-3 p-3">
                <div>
                  <div className="ss-tag" style={{ fontSize: "0.55rem" }}>
                    Signature service checklist
                  </div>
                  <p className="mt-0.5 text-[0.74rem] opacity-65">
                    Tick each step as you go. Add a photo wherever it helps the report.
                  </p>
                </div>
                <span className="ss-num text-[1.05rem] font-bold" style={{ color: "hsl(var(--ss-burgundy))" }}>
                  {doneCount}/{steps.length}
                </span>
              </div>

              {steps.map((t, i) => {
                const newPhase = steps[i - 1]?.phase !== t.phase;
                return (
                  <div key={t.id}>
                    {newPhase && (
                      <div className="ss-tag px-1 pb-1 pt-3" style={{ fontSize: "0.55rem" }}>
                        {PHASE_LABEL[t.phase]}
                      </div>
                    )}
                    {t.custom && !steps[i - 1]?.custom && !newPhase && (
                      <div className="ss-tag px-1 pb-1 pt-3" style={{ fontSize: "0.55rem" }}>
                        Specific to this pool
                      </div>
                    )}
                    <div className="ss-card p-3">
                      <label className="flex items-start gap-2.5">
                        <input
                          type="checkbox"
                          className="mt-1"
                          checked={!!checked[t.id]}
                          onChange={(e) => setChecked((s) => ({ ...s, [t.id]: e.target.checked }))}
                        />
                        <span className="flex-1">
                          <span className="text-[0.87rem] font-medium">
                            {!t.custom && (
                              <span className="ss-num mr-1.5 opacity-45">{String(i + 1).padStart(2, "0")}</span>
                            )}
                            {t.label}
                          </span>
                          <span className="ml-1.5 inline-flex gap-1 align-middle">
                            {t.is_required && <Chip tone="burgundy">Required</Chip>}
                            {t.photo === "required" && <Chip tone="aqua">Photo</Chip>}
                          </span>
                          {t.hint && <span className="mt-0.5 block text-[0.74rem] opacity-60">{t.hint}</span>}
                        </span>
                      </label>
                      {checked[t.id] && t.photo !== "none" && (
                        <label className="ss-btn ss-btn-ghost mt-2 w-full cursor-pointer">
                          <Camera size={13} />
                          {(taskPhotos[t.id]?.length ?? 0) > 0
                            ? `${taskPhotos[t.id]?.length} photo${(taskPhotos[t.id]?.length ?? 0) > 1 ? "s" : ""} attached ✓ · add another`

                            : t.photo === "required"
                              ? "Capture photo"
                              : "Add photo (optional)"}
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            multiple
                            className="hidden"
                            onChange={async (e) => {
                              const files = Array.from(e.target.files ?? []);
                              e.target.value = "";
                              for (const f of files) {
                                const up = await upload(f, `task-${t.id}`);
                                if (!up) continue;
                                setTaskPhotos((s) => ({ ...s, [t.id]: [...(s[t.id] ?? []), up.path] }));
                                setEvidence((s) => [...s, { label: t.label, path: up.path, url: up.url }]);
                              }
                            }}
                          />
                        </label>
                      )}

                    </div>
                  </div>
                );
              })}

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
              <div className="ss-card p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="ss-tag" style={{ fontSize: "0.55rem" }}>
                    Before &amp; after · required
                  </div>
                  <Chip tone={before && after ? "aqua" : "burgundy"}>
                    {before && after ? "Complete" : after ? "Before missing" : "After missing"}
                  </Chip>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2.5">
                  <PhotoTile label="Before" tone="#1C2A33" value={before} onPick={async (f) => setBefore(await upload(f, "before"))} />
                  <PhotoTile label="After" tone="#8E1F2C" value={after} onPick={async (f) => setAfter(await upload(f, "after"))} />
                </div>
                <p className="mt-2 text-[0.74rem] opacity-65">
                  Both photos go on the customer report. The visit can&apos;t be completed without them.
                </p>
              </div>

              <div className="ss-card p-3">
                <div className="ss-tag" style={{ fontSize: "0.55rem" }}>
                  Visual evidence (added to the customer report)
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {EVIDENCE_KINDS.map((k) => (
                    <label
                      key={k.tag}
                      className="ss-chip cursor-pointer"
                      style={{ background: "hsl(var(--ss-white))" }}
                    >
                      <Camera size={10} />
                      {uploadingTag === k.tag ? "Uploading…" : k.label}
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        multiple
                        className="hidden"
                        onChange={async (e) => {
                          const files = Array.from(e.target.files ?? []);
                          e.target.value = "";
                          if (!files.length) return;
                          setUploadingTag(k.tag);
                          for (const f of files) {
                            const up = await upload(f, k.tag);
                            if (up) setEvidence((s) => [...s, { label: k.label, path: up.path, url: up.url }]);
                          }
                          setUploadingTag(null);
                        }}
                      />
                    </label>
                  ))}
                </div>
                {evidence.length > 0 ? (
                  <div className="mt-2.5 grid grid-cols-3 gap-2">
                    {evidence.map((p) => (
                      <div key={p.path} className="relative overflow-hidden rounded-[10px]">
                        <img src={p.url} alt={p.label} className="aspect-square w-full object-cover" />
                        <span
                          className="ss-chip absolute bottom-1 left-1"
                          style={{ background: "rgba(0,0,0,.62)", color: "#fff", borderColor: "transparent", fontSize: "0.5rem" }}
                        >
                          {p.label}
                        </span>
                        <button
                          type="button"
                          aria-label={`Remove ${p.label} photo`}
                          className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white"
                          onClick={() => setEvidence((s) => s.filter((x) => x.path !== p.path))}
                        >
                          <X size={10} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-[0.74rem] opacity-60">
                    Snap the water clarity and any equipment you touched — these ride along with the measurements.
                  </p>
                )}
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

              {perBody.map((b) => (
                <div key={b.id} className="space-y-1">
                  {bodies.length > 1 && (
                    <div className="ss-label">
                      {b.name} · {b.gallons.toLocaleString()} gal
                    </div>
                  )}
                  <ChemicalsAdded
                    entries={applied[b.id] ?? []}
                    onChange={(next) => setApplied((s) => ({ ...s, [b.id]: next }))}
                    suggested={{ chlorine: b.dose.chlorine_oz, acid: b.dose.acid_oz }}
                  />
                </div>
              ))}

              <InventoryUsed rows={used} onChange={setUsed} />
              {used.some((u) => u.qty > 0) && (
                <div className="text-[0.72rem] opacity-70">
                  {used.filter((u) => u.qty > 0).length} item(s) · {money2(usedTotal(used))} will be pulled from
                  on-hand stock when this visit is completed.
                </div>
              )}


              {bodies.length > 1 && (
                <div className="ss-card p-3">
                  <div className="ss-tag" style={{ fontSize: "0.55rem" }}>
                    Every body of water
                  </div>
                  <div className="mt-2 space-y-2">
                    {perBody.map((b) => (
                      <div key={b.id} className="flex items-start justify-between gap-2 text-[0.76rem]">
                        <div>
                          <div className="font-semibold">
                            {b.name} <span className="opacity-55">· {b.gallons.toLocaleString()} gal</span>
                          </div>
                          <div className="opacity-65">{b.report.summary}</div>
                        </div>
                        <div className="ss-num whitespace-nowrap text-right">
                          <div>{b.dose.chlorine_oz} oz Cl</div>
                          <div>{b.dose.acid_oz} oz acid</div>
                          <div className="opacity-65">{money2(b.dose.cost)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 border-t pt-2 text-[0.76rem]" style={{ borderColor: "hsl(var(--ss-sand))" }}>
                    Total chem cost <strong className="ss-num">{money2(totalChemCost)}</strong>
                    <span className="opacity-60"> · {anyLogged ? "from products logged" : `estimated ${money2(estimatedChemCost)}`}</span>
                  </div>
                </div>
              )}

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
              disabled={(step === 1 && !before) || (step === 2 && blockingTasks.length > 0)}
              onClick={() => setStep((s) => s + 1)}
            >
              Continue
            </button>
          ) : (
            <button className="ss-btn flex-1" disabled={saving || !before || !after} onClick={finish}>
              <Check size={14} /> {saving ? "Saving…" : !before || !after ? "Photo required" : "Complete visit"}
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
  wide = false,
}: {
  label: string;
  tone: string;
  value: { url: string } | null;
  onPick: (f: File) => void | Promise<void>;
  wide?: boolean;
}) {
  return (
    <label
      className={`ss-card relative flex cursor-pointer items-center justify-center overflow-hidden ${wide ? "aspect-[16/9]" : "aspect-square"}`}
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
