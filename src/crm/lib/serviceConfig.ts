/**
 * Service setup catalog — everything that used to be hardcoded in the app
 * (water readings, chemicals, checklist, work order types) now lives in the
 * database so the owner can edit it without a code change.
 *
 * Every loader falls back to the built-in defaults when the tables are empty
 * so a fresh install (or an offline blip) never leaves a tech with a blank
 * visit sheet.
 */
import { supabase } from "@/integrations/supabase/client";
import { useTable } from "@/crm/lib/useSavvy";
import { READING_FIELDS } from "@/crm/lib/chem";
import { SIGNATURE_CHECKLIST, type ChecklistPhoto } from "@/crm/lib/checklist";

export type ReadingField = {
  id: string;
  key: string;
  label: string;
  unit: string;
  target_min: number | null;
  target_max: number | null;
  step: number;
  purpose: string | null;
  sort_order: number;
  is_active: boolean;
};

export type DosageProduct = {
  id: string;
  name: string;
  dose_key: string;
  strength_pct: number | null;
  unit: string;
  cost_per_unit: number;
  is_default: boolean;
  sort_order: number;
  is_active: boolean;
};

export type ChecklistItemRow = {
  id: string;
  label: string;
  hint: string | null;
  is_required: boolean;
  photo: ChecklistPhoto;
  plan_id: string | null;
  sort_order: number;
  is_active: boolean;
};

export type WorkOrderType = {
  id: string;
  name: string;
  color: string;
  default_price: number;
  default_minutes: number;
  default_checklist: string[];
  description: string | null;
  sort_order: number;
  is_active: boolean;
};

export type WaterBody = {
  id: string;
  customer_id: string;
  name: string;
  kind: string;
  gallons: number;
  surface: string | null;
  sanitizer: string | null;
  notes: string | null;
  sort_order: number;
  is_active: boolean;
};

export const WATER_BODY_KINDS = ["pool", "spa", "water_feature"] as const;
export const DOSE_KEYS = [
  { key: "chlorine", label: "Chlorine / sanitizer" },
  { key: "acid", label: "pH down (acid)" },
  { key: "ph_up", label: "pH up" },
  { key: "alkalinity_up", label: "Alkalinity up" },
  { key: "hardness_up", label: "Hardness up" },
  { key: "cya_up", label: "CYA / stabilizer" },
  { key: "salt_up", label: "Salt" },
  { key: "other", label: "Other" },
] as const;

export const PHOTO_MODES: ChecklistPhoto[] = ["none", "suggested", "required"];

/** Built-in reading fields, shaped like database rows. */
export const DEFAULT_READING_FIELDS: ReadingField[] = READING_FIELDS.map((f, i) => {
  const [min, max] = f.target.includes("–") ? f.target.split("–").map(Number) : [null, null];
  return {
    id: `default-${f.key}`,
    key: f.key,
    label: f.label,
    unit: f.unit,
    target_min: Number.isFinite(min as number) ? (min as number) : null,
    target_max: Number.isFinite(max as number) ? (max as number) : null,
    step: f.step,
    purpose: null,
    sort_order: i + 1,
    is_active: true,
  };
});

export const DEFAULT_CHECKLIST: ChecklistItemRow[] = SIGNATURE_CHECKLIST.map((s, i) => ({
  id: s.id,
  label: s.label,
  hint: s.hint,
  is_required: s.is_required,
  photo: s.photo,
  plan_id: null,
  sort_order: i + 1,
  is_active: true,
}));

export function readingTarget(f: Pick<ReadingField, "target_min" | "target_max" | "unit">) {
  if (f.target_min == null || f.target_max == null) return "—";
  return `${f.target_min}–${f.target_max}`;
}

export function readingStatus(
  f: Pick<ReadingField, "target_min" | "target_max">,
  value: number | undefined,
): "good" | "low" | "high" | "unknown" {
  if (value === undefined || Number.isNaN(value)) return "unknown";
  if (f.target_min == null || f.target_max == null) return "unknown";
  if (value < f.target_min) return "low";
  if (value > f.target_max) return "high";
  return "good";
}

/* ── loaders ────────────────────────────────────────────────────────── */

export function useReadingFields(activeOnly = false) {
  return useTable<ReadingField>(
    `reading-fields-${activeOnly}`,
    async () => {
      let q = supabase.from("ss_reading_fields").select("*").order("sort_order");
      if (activeOnly) q = q.eq("is_active", true);
      const { data } = await q;
      const rows = (data ?? []) as unknown as ReadingField[];
      return rows.length ? rows : DEFAULT_READING_FIELDS;
    },
    [activeOnly],
  );
}

export function useDosageProducts(activeOnly = false) {
  return useTable<DosageProduct>(
    `dosage-products-${activeOnly}`,
    async () => {
      let q = supabase.from("ss_dosage_products").select("*").order("sort_order");
      if (activeOnly) q = q.eq("is_active", true);
      const { data } = await q;
      return (data ?? []) as unknown as DosageProduct[];
    },
    [activeOnly],
  );
}

export function useChecklistItems(activeOnly = false, planId?: string | null) {
  return useTable<ChecklistItemRow>(
    `checklist-items-${activeOnly}-${planId ?? "all"}`,
    async () => {
      let q = supabase.from("ss_checklist_items").select("*").order("sort_order");
      if (activeOnly) q = q.eq("is_active", true);
      const { data } = await q;
      let rows = (data ?? []) as unknown as ChecklistItemRow[];
      if (!rows.length) rows = DEFAULT_CHECKLIST;
      if (planId) rows = rows.filter((r) => !r.plan_id || r.plan_id === planId);
      return rows;
    },
    [activeOnly, planId],
  );
}

export function useWorkOrderTypes(activeOnly = false) {
  return useTable<WorkOrderType>(
    `work-order-types-${activeOnly}`,
    async () => {
      let q = supabase.from("ss_work_order_types").select("*").order("sort_order");
      if (activeOnly) q = q.eq("is_active", true);
      const { data } = await q;
      return ((data ?? []) as unknown as WorkOrderType[]).map((t) => ({
        ...t,
        default_checklist: Array.isArray(t.default_checklist) ? t.default_checklist : [],
      }));
    },
    [activeOnly],
  );
}

export function useWaterBodies(customerId: string | null | undefined) {
  return useTable<WaterBody>(
    `water-bodies-${customerId ?? "none"}`,
    async () => {
      if (!customerId) return [];
      const { data } = await supabase
        .from("ss_water_bodies")
        .select("*")
        .eq("customer_id", customerId)
        .order("sort_order");
      return (data ?? []) as unknown as WaterBody[];
    },
    [customerId],
  );
}
