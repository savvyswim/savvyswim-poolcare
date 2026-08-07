import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Chip, EmptyState, SectionTitle } from "@/crm/components/Brand";
import { useSavvyIdentity } from "@/crm/lib/useSavvy";
import { SERVICE_PLANS } from "@/crm/lib/pricingEngine";
import {
  DOSE_KEYS,
  PHOTO_MODES,
  useChecklistItems,
  useDosageProducts,
  useReadingFields,
  useWorkOrderTypes,
  type ChecklistItemRow,
  type DosageProduct,
  type ReadingField,
  type WorkOrderType,
} from "@/crm/lib/serviceConfig";

type TableName =
  | "ss_reading_fields"
  | "ss_dosage_products"
  | "ss_checklist_items"
  | "ss_work_order_types";

const TABS = ["Readings", "Chemicals", "Checklist", "Work orders"] as const;
type Tab = (typeof TABS)[number];

/** Small write helpers shared by every tab. */
function useWriter(table: TableName, refetch: () => void) {
  return {
    async patch(id: string, patch: Record<string, unknown>) {
      const { error } = await supabase.from(table).update(patch as never).eq("id", id);
      if (error) toast.error(error.message);
      else refetch();
    },
    async create(row: Record<string, unknown>) {
      const { error } = await supabase.from(table).insert(row as never);
      if (error) toast.error(error.message);
      else {
        toast.success("Added");
        refetch();
      }
    },
    async remove(id: string) {
      const { error } = await supabase.from(table).delete().eq("id", id);
      if (error) toast.error(error.message);
      else refetch();
    },
    async swap(a: { id: string; sort_order: number }, b: { id: string; sort_order: number }) {
      await supabase.from(table).update({ sort_order: b.sort_order } as never).eq("id", a.id);
      await supabase.from(table).update({ sort_order: a.sort_order } as never).eq("id", b.id);
      refetch();
    },
  };
}

function Reorder<T extends { id: string; sort_order: number }>({
  rows,
  index,
  swap,
}: {
  rows: T[];
  index: number;
  swap: (a: T, b: T) => void;
}) {
  const prev = rows[index - 1];
  const next = rows[index + 1];
  const me = rows[index]!;
  return (
    <div className="flex flex-col">
      <button
        className="opacity-45 hover:opacity-100 disabled:opacity-15"
        disabled={!prev}
        aria-label="Move up"
        onClick={() => prev && swap(me, prev)}
      >
        <ArrowUp size={13} />
      </button>
      <button
        className="opacity-45 hover:opacity-100 disabled:opacity-15"
        disabled={!next}
        aria-label="Move down"
        onClick={() => next && swap(me, next)}
      >
        <ArrowDown size={13} />
      </button>
    </div>
  );
}

/** Text input that only writes on blur, so typing never fires a request. */
function Cell({
  value,
  onSave,
  type = "text",
  step,
  className = "",
  placeholder,
  readOnly,
}: {
  value: string | number | null;
  onSave: (v: string) => void;
  type?: string;
  step?: number;
  className?: string;
  placeholder?: string;
  readOnly?: boolean;
}) {
  const [v, setV] = useState(value ?? "");
  useEffect(() => setV(value ?? ""), [value]);
  return (
    <input
      className={`ss-input ${className}`}
      type={type}
      step={step}
      placeholder={placeholder}
      readOnly={readOnly}
      value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => String(v) !== String(value ?? "") && onSave(String(v))}
    />
  );
}

export default function ServiceSetup() {
  const { isOffice } = useSavvyIdentity();
  const [tab, setTab] = useState<Tab>("Readings");

  return (
    <div className="space-y-4">
      <SectionTitle
        title="Service setup"
        sub="Readings, chemicals, checklist and work order types — everything the field app runs on"
      />
      {!isOffice && (
        <div className="ss-card p-3 text-[0.82rem] opacity-75">
          Read-only — only office staff can change service setup.
        </div>
      )}
      <div className="flex flex-wrap gap-1.5">
        {TABS.map((t) => (
          <button key={t} className={`ss-btn ${tab === t ? "" : "ss-btn-ghost"}`} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>

      {tab === "Readings" && <ReadingsTab canEdit={isOffice} />}
      {tab === "Chemicals" && <ChemicalsTab canEdit={isOffice} />}
      {tab === "Checklist" && <ChecklistTab canEdit={isOffice} />}
      {tab === "Work orders" && <WorkOrdersTab canEdit={isOffice} />}
    </div>
  );
}

/* ── Readings ───────────────────────────────────────────────────────── */

function ReadingsTab({ canEdit }: { canEdit: boolean }) {
  const { rows, refetch } = useReadingFields();
  const w = useWriter("ss_reading_fields", refetch);
  const list = rows as ReadingField[];

  return (
    <div className="space-y-2">
      <div className="ss-card p-3 text-[0.78rem] opacity-70">
        These are the fields a tech fills in on step 1 of every visit. Targets drive the OK / low / high badges.
      </div>
      {!list.length && <EmptyState>No reading fields yet.</EmptyState>}
      {list.map((r, i) => (
        <div key={r.id} className="ss-card flex flex-wrap items-end gap-2 p-3">
          {canEdit && <Reorder rows={list} index={i} swap={(a, b) => void w.swap(a, b)} />}
          <div className="min-w-[130px] flex-1">
            <label className="ss-label">Label</label>
            <Cell value={r.label} readOnly={!canEdit} onSave={(v) => void w.patch(r.id, { label: v })} />
          </div>
          <div className="w-[92px]">
            <label className="ss-label">Key</label>
            <Cell value={r.key} readOnly={!canEdit} onSave={(v) => void w.patch(r.id, { key: v })} />
          </div>
          <div className="w-[70px]">
            <label className="ss-label">Unit</label>
            <Cell value={r.unit} readOnly={!canEdit} onSave={(v) => void w.patch(r.id, { unit: v })} />
          </div>
          <div className="w-[78px]">
            <label className="ss-label">Min</label>
            <Cell
              value={r.target_min}
              type="number"
              step={0.1}
              readOnly={!canEdit}
              onSave={(v) => void w.patch(r.id, { target_min: v === "" ? null : Number(v) })}
            />
          </div>
          <div className="w-[78px]">
            <label className="ss-label">Max</label>
            <Cell
              value={r.target_max}
              type="number"
              step={0.1}
              readOnly={!canEdit}
              onSave={(v) => void w.patch(r.id, { target_max: v === "" ? null : Number(v) })}
            />
          </div>
          <div className="w-[70px]">
            <label className="ss-label">Step</label>
            <Cell
              value={r.step}
              type="number"
              step={0.1}
              readOnly={!canEdit}
              onSave={(v) => void w.patch(r.id, { step: Number(v) || 1 })}
            />
          </div>
          {canEdit && (
            <>
              <button
                className={`ss-btn ${r.is_active ? "" : "ss-btn-ghost"}`}
                onClick={() => void w.patch(r.id, { is_active: !r.is_active })}
              >
                {r.is_active ? "On" : "Off"}
              </button>
              <button className="ss-btn ss-btn-ghost" aria-label="Delete" onClick={() => void w.remove(r.id)}>
                <Trash2 size={13} />
              </button>
            </>
          )}
        </div>
      ))}
      {canEdit && (
        <button
          className="ss-btn"
          onClick={() =>
            void w.create({
              key: `field_${Date.now().toString(36)}`,
              label: "New reading",
              unit: "ppm",
              step: 1,
              sort_order: (list.at(-1)?.sort_order ?? 0) + 1,
            })
          }
        >
          <Plus size={13} /> Add reading
        </button>
      )}
    </div>
  );
}

/* ── Chemicals ──────────────────────────────────────────────────────── */

function ChemicalsTab({ canEdit }: { canEdit: boolean }) {
  const { rows, refetch } = useDosageProducts();
  const w = useWriter("ss_dosage_products", refetch);
  const list = rows as DosageProduct[];

  return (
    <div className="space-y-2">
      <div className="ss-card p-3 text-[0.78rem] opacity-70">
        Your real chemical SKUs. Strength drives the dose math, cost per unit drives the chem cost on every visit.
      </div>
      {list.map((p, i) => (
        <div key={p.id} className="ss-card flex flex-wrap items-end gap-2 p-3">
          {canEdit && <Reorder rows={list} index={i} swap={(a, b) => void w.swap(a, b)} />}
          <div className="min-w-[170px] flex-1">
            <label className="ss-label">Product</label>
            <Cell value={p.name} readOnly={!canEdit} onSave={(v) => void w.patch(p.id, { name: v })} />
          </div>
          <div className="w-[150px]">
            <label className="ss-label">Used for</label>
            <select
              className="ss-input"
              disabled={!canEdit}
              value={p.dose_key}
              onChange={(e) => void w.patch(p.id, { dose_key: e.target.value })}
            >
              {DOSE_KEYS.map((d) => (
                <option key={d.key} value={d.key}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>
          <div className="w-[86px]">
            <label className="ss-label">Strength %</label>
            <Cell
              value={p.strength_pct}
              type="number"
              step={0.05}
              readOnly={!canEdit}
              onSave={(v) => void w.patch(p.id, { strength_pct: v === "" ? null : Number(v) })}
            />
          </div>
          <div className="w-[70px]">
            <label className="ss-label">Unit</label>
            <Cell value={p.unit} readOnly={!canEdit} onSave={(v) => void w.patch(p.id, { unit: v })} />
          </div>
          <div className="w-[96px]">
            <label className="ss-label">Cost / unit</label>
            <Cell
              value={p.cost_per_unit}
              type="number"
              step={0.001}
              readOnly={!canEdit}
              onSave={(v) => void w.patch(p.id, { cost_per_unit: Number(v) || 0 })}
            />
          </div>
          {canEdit && (
            <>
              <button
                className={`ss-btn ${p.is_default ? "" : "ss-btn-ghost"}`}
                title="Default product for this dose"
                onClick={() => void w.patch(p.id, { is_default: !p.is_default })}
              >
                {p.is_default ? "Default" : "Set default"}
              </button>
              <button
                className={`ss-btn ${p.is_active ? "" : "ss-btn-ghost"}`}
                onClick={() => void w.patch(p.id, { is_active: !p.is_active })}
              >
                {p.is_active ? "On" : "Off"}
              </button>
              <button className="ss-btn ss-btn-ghost" aria-label="Delete" onClick={() => void w.remove(p.id)}>
                <Trash2 size={13} />
              </button>
            </>
          )}
        </div>
      ))}
      {canEdit && (
        <button
          className="ss-btn"
          onClick={() =>
            void w.create({
              name: "New chemical",
              dose_key: "other",
              unit: "oz",
              cost_per_unit: 0,
              sort_order: (list.at(-1)?.sort_order ?? 0) + 1,
            })
          }
        >
          <Plus size={13} /> Add chemical
        </button>
      )}
    </div>
  );
}

/* ── Checklist ──────────────────────────────────────────────────────── */

function ChecklistTab({ canEdit }: { canEdit: boolean }) {
  const { rows, refetch } = useChecklistItems();
  const w = useWriter("ss_checklist_items", refetch);
  const list = rows as ChecklistItemRow[];

  return (
    <div className="space-y-2">
      <div className="ss-card p-3 text-[0.78rem] opacity-70">
        The signature service checklist. Leave the plan blank to run a step on every visit, or scope it to one plan.
      </div>
      {list.map((s, i) => (
        <div key={s.id} className="ss-card flex flex-wrap items-end gap-2 p-3">
          {canEdit && <Reorder rows={list} index={i} swap={(a, b) => void w.swap(a, b)} />}
          <div className="min-w-[220px] flex-1">
            <label className="ss-label">Step {i + 1}</label>
            <Cell value={s.label} readOnly={!canEdit} onSave={(v) => void w.patch(s.id, { label: v })} />
            <Cell
              className="mt-1 text-[0.76rem]"
              value={s.hint}
              placeholder="Hint for the tech"
              readOnly={!canEdit}
              onSave={(v) => void w.patch(s.id, { hint: v || null })}
            />
          </div>
          <div className="w-[130px]">
            <label className="ss-label">Photo</label>
            <select
              className="ss-input"
              disabled={!canEdit}
              value={s.photo}
              onChange={(e) => void w.patch(s.id, { photo: e.target.value })}
            >
              {PHOTO_MODES.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div className="w-[150px]">
            <label className="ss-label">Plan</label>
            <select
              className="ss-input"
              disabled={!canEdit}
              value={s.plan_id ?? ""}
              onChange={(e) => void w.patch(s.id, { plan_id: e.target.value || null })}
            >
              <option value="">All plans</option>
              {SERVICE_PLANS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          {canEdit && (
            <>
              <button
                className={`ss-btn ${s.is_required ? "" : "ss-btn-ghost"}`}
                onClick={() => void w.patch(s.id, { is_required: !s.is_required })}
              >
                {s.is_required ? "Required" : "Optional"}
              </button>
              <button
                className={`ss-btn ${s.is_active ? "" : "ss-btn-ghost"}`}
                onClick={() => void w.patch(s.id, { is_active: !s.is_active })}
              >
                {s.is_active ? "On" : "Off"}
              </button>
              <button className="ss-btn ss-btn-ghost" aria-label="Delete" onClick={() => void w.remove(s.id)}>
                <Trash2 size={13} />
              </button>
            </>
          )}
        </div>
      ))}
      {canEdit && (
        <button
          className="ss-btn"
          onClick={() =>
            void w.create({
              label: "New checklist step",
              photo: "none",
              is_required: true,
              sort_order: (list.at(-1)?.sort_order ?? 0) + 1,
            })
          }
        >
          <Plus size={13} /> Add step
        </button>
      )}
    </div>
  );
}

/* ── Work order types ───────────────────────────────────────────────── */

function WorkOrdersTab({ canEdit }: { canEdit: boolean }) {
  const { rows, refetch } = useWorkOrderTypes();
  const w = useWriter("ss_work_order_types", refetch);
  const list = rows as WorkOrderType[];

  return (
    <div className="space-y-2">
      <div className="ss-card p-3 text-[0.78rem] opacity-70">
        Typed, color-coded work orders. Defaults pre-fill any job created with that type.
      </div>
      {list.map((t, i) => (
        <div key={t.id} className="ss-card p-3">
          <div className="flex flex-wrap items-end gap-2">
            {canEdit && <Reorder rows={list} index={i} swap={(a, b) => void w.swap(a, b)} />}
            <span
              className="mb-1 h-4 w-4 shrink-0 rounded-full"
              style={{ background: t.color, border: "1px solid rgba(0,0,0,.2)" }}
            />
            <div className="min-w-[160px] flex-1">
              <label className="ss-label">Type</label>
              <Cell value={t.name} readOnly={!canEdit} onSave={(v) => void w.patch(t.id, { name: v })} />
            </div>
            <div className="w-[78px]">
              <label className="ss-label">Color</label>
              <input
                className="ss-input !p-0.5"
                type="color"
                disabled={!canEdit}
                value={t.color}
                onChange={(e) => void w.patch(t.id, { color: e.target.value })}
              />
            </div>
            <div className="w-[96px]">
              <label className="ss-label">Price</label>
              <Cell
                value={t.default_price}
                type="number"
                step={1}
                readOnly={!canEdit}
                onSave={(v) => void w.patch(t.id, { default_price: Number(v) || 0 })}
              />
            </div>
            <div className="w-[96px]">
              <label className="ss-label">Minutes</label>
              <Cell
                value={t.default_minutes}
                type="number"
                step={5}
                readOnly={!canEdit}
                onSave={(v) => void w.patch(t.id, { default_minutes: Number(v) || 0 })}
              />
            </div>
            {canEdit && (
              <>
                <button
                  className={`ss-btn ${t.is_active ? "" : "ss-btn-ghost"}`}
                  onClick={() => void w.patch(t.id, { is_active: !t.is_active })}
                >
                  {t.is_active ? "On" : "Off"}
                </button>
                <button className="ss-btn ss-btn-ghost" aria-label="Delete" onClick={() => void w.remove(t.id)}>
                  <Trash2 size={13} />
                </button>
              </>
            )}
          </div>
          <div className="mt-2 grid gap-2 md:grid-cols-2">
            <div>
              <label className="ss-label">Description</label>
              <Cell
                value={t.description}
                readOnly={!canEdit}
                onSave={(v) => void w.patch(t.id, { description: v || null })}
              />
            </div>
            <div>
              <label className="ss-label">Default checklist (one per line)</label>
              <textarea
                className="ss-input text-[0.78rem]"
                rows={3}
                readOnly={!canEdit}
                defaultValue={t.default_checklist.join("\n")}
                onBlur={(e) =>
                  void w.patch(t.id, {
                    default_checklist: e.target.value
                      .split("\n")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  })
                }
              />
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {t.default_checklist.map((c) => (
              <Chip key={c} tone="ink">
                {c}
              </Chip>
            ))}
          </div>
        </div>
      ))}
      {canEdit && (
        <button
          className="ss-btn"
          onClick={() =>
            void w.create({
              name: "New work order type",
              color: "#1FA9BE",
              sort_order: (list.at(-1)?.sort_order ?? 0) + 1,
            })
          }
        >
          <Plus size={13} /> Add work order type
        </button>
      )}
    </div>
  );
}
