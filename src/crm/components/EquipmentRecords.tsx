import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Plus, Trash2, Wrench, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Chip, EmptyState } from "@/crm/components/Brand";
import { useWaterBodies } from "@/crm/lib/serviceConfig";

const MAX_BYTES = 10 * 1024 * 1024;

export const EQUIPMENT_KINDS = [
  "heater",
  "pump",
  "filter",
  "salt_system",
  "cleaner",
  "automation",
  "other",
] as const;

const KIND_LABEL: Record<string, string> = {
  heater: "Heater",
  pump: "Pump",
  filter: "Filter",
  salt_system: "Salt system",
  cleaner: "Cleaner",
  automation: "Automation",
  other: "Other",
};

const KIND_TONE: Record<string, "aqua" | "burgundy" | "green" | "gold" | "ink"> = {
  heater: "burgundy",
  pump: "aqua",
  filter: "green",
  salt_system: "gold",
  cleaner: "ink",
  automation: "ink",
  other: "ink",
};

const CONDITIONS = ["good", "watch", "needs_repair", "end_of_life"] as const;
const CONDITION_TONE: Record<string, "green" | "gold" | "orange" | "burgundy"> = {
  good: "green",
  watch: "gold",
  needs_repair: "orange",
  end_of_life: "burgundy",
};

type Photo = { path: string; name: string };

export type EquipmentRow = {
  id: string;
  customer_id: string;
  water_body_id: string | null;
  kind: string;
  name: string;
  brand: string | null;
  model: string | null;
  serial_number: string | null;
  condition: string;
  installed_on: string | null;
  warranty_expires_on: string | null;
  last_serviced_on: string | null;
  notes: string | null;
  photos: Photo[];
  sort_order: number;
};

/**
 * Per-unit equipment records for a property — heater, pump, filter, salt
 * system and friends, each with its own brand/model/serial, warranty dates,
 * condition, photos and notes.
 */
export default function EquipmentRecords({
  customerId,
  canEdit,
}: {
  customerId: string;
  canEdit: boolean;
}) {
  const [rows, setRows] = useState<EquipmentRow[]>([]);
  const [signed, setSigned] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const { rows: bodies } = useWaterBodies(customerId);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("ss_equipment")
      .select("*")
      .eq("customer_id", customerId)
      .order("sort_order");
    const list = ((data ?? []) as unknown as EquipmentRow[]).map((r) => ({
      ...r,
      photos: Array.isArray(r.photos) ? r.photos : [],
    }));
    setRows(list);
    const paths = list.flatMap((r) => r.photos.map((p) => p.path)).filter(Boolean);
    if (paths.length) {
      const { data: urls } = await supabase.storage.from("equipment-photos").createSignedUrls(paths, 3600);
      const map: Record<string, string> = {};
      for (const u of urls ?? []) if (u.path && u.signedUrl) map[u.path] = u.signedUrl;
      setSigned(map);
    }
    setLoading(false);
  }, [customerId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function patch(id: string, p: Partial<EquipmentRow>) {
    const { error } = await supabase.from("ss_equipment").update(p as never).eq("id", id);
    if (error) toast.error(error.message);
    else void load();
  }

  async function add(kind: string) {
    setBusy(true);
    const { error } = await supabase.from("ss_equipment").insert({
      customer_id: customerId,
      kind,
      name: KIND_LABEL[kind] ?? "Equipment",
      sort_order: (rows.at(-1)?.sort_order ?? 0) + 1,
    } as never);
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      toast.success(`${KIND_LABEL[kind]} added`);
      void load();
    }
  }

  async function remove(row: EquipmentRow) {
    if (row.photos.length) {
      await supabase.storage.from("equipment-photos").remove(row.photos.map((p) => p.path));
    }
    const { error } = await supabase.from("ss_equipment").delete().eq("id", row.id);
    if (error) toast.error(error.message);
    else void load();
  }

  async function upload(row: EquipmentRow, list: FileList | null) {
    if (!list?.length) return;
    setBusy(true);
    try {
      const next: Photo[] = [...row.photos];
      for (const file of Array.from(list)) {
        if (!file.type.startsWith("image/")) {
          toast.error(`${file.name} isn't an image`);
          continue;
        }
        if (file.size > MAX_BYTES) {
          toast.error(`${file.name} is over 10MB`);
          continue;
        }
        const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = `${customerId}/${row.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error } = await supabase.storage
          .from("equipment-photos")
          .upload(path, file, { contentType: file.type, upsert: false });
        if (error) throw error;
        next.push({ path, name: file.name });
      }
      await patch(row.id, { photos: next });
      toast.success("Photos saved");
    } catch (e) {
      toast.error((e as Error).message || "Upload failed");
    } finally {
      setBusy(false);
      const el = fileRefs.current[row.id];
      if (el) el.value = "";
    }
  }

  async function removePhoto(row: EquipmentRow, path: string) {
    await supabase.storage.from("equipment-photos").remove([path]);
    await patch(row.id, { photos: row.photos.filter((p) => p.path !== path) });
  }

  return (
    <div className="space-y-2">
      <div className="ss-card p-3 text-[0.78rem] opacity-70">
        <Wrench size={13} className="mr-1 inline" /> One record per unit — brand, model, serial, warranty,
        condition, photos and notes so techs know exactly what's on the pad.
      </div>

      {loading && <EmptyState>Loading equipment…</EmptyState>}
      {!loading && !rows.length && <EmptyState>No equipment recorded yet.</EmptyState>}

      {rows.map((e) => (
        <div key={e.id} className="ss-card p-3">
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-[150px] flex-1">
              <label className="ss-label">Name</label>
              <input
                className="ss-input"
                readOnly={!canEdit}
                defaultValue={e.name}
                onBlur={(ev) => ev.target.value !== e.name && void patch(e.id, { name: ev.target.value })}
              />
            </div>
            <div className="w-[140px]">
              <label className="ss-label">Type</label>
              <select
                className="ss-input"
                disabled={!canEdit}
                value={e.kind}
                onChange={(ev) => void patch(e.id, { kind: ev.target.value })}
              >
                {EQUIPMENT_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {KIND_LABEL[k]}
                  </option>
                ))}
              </select>
            </div>
            <div className="w-[150px]">
              <label className="ss-label">Body of water</label>
              <select
                className="ss-input"
                disabled={!canEdit}
                value={e.water_body_id ?? ""}
                onChange={(ev) => void patch(e.id, { water_body_id: ev.target.value || null })}
              >
                <option value="">Whole property</option>
                {bodies.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="w-[140px]">
              <label className="ss-label">Condition</label>
              <select
                className="ss-input"
                disabled={!canEdit}
                value={e.condition}
                onChange={(ev) => void patch(e.id, { condition: ev.target.value })}
              >
                {CONDITIONS.map((c) => (
                  <option key={c} value={c}>
                    {c.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>
            {canEdit && (
              <button className="ss-btn ss-btn-ghost" aria-label="Remove" onClick={() => void remove(e)}>
                <Trash2 size={13} />
              </button>
            )}
          </div>

          <div className="mt-2 flex flex-wrap items-end gap-2">
            <div className="w-[140px]">
              <label className="ss-label">Brand</label>
              <input
                className="ss-input"
                readOnly={!canEdit}
                placeholder="Pentair, Hayward…"
                defaultValue={e.brand ?? ""}
                onBlur={(ev) => void patch(e.id, { brand: ev.target.value || null })}
              />
            </div>
            <div className="w-[140px]">
              <label className="ss-label">Model</label>
              <input
                className="ss-input"
                readOnly={!canEdit}
                defaultValue={e.model ?? ""}
                onBlur={(ev) => void patch(e.id, { model: ev.target.value || null })}
              />
            </div>
            <div className="w-[150px]">
              <label className="ss-label">Serial</label>
              <input
                className="ss-input"
                readOnly={!canEdit}
                defaultValue={e.serial_number ?? ""}
                onBlur={(ev) => void patch(e.id, { serial_number: ev.target.value || null })}
              />
            </div>
            <div className="w-[140px]">
              <label className="ss-label">Installed</label>
              <input
                className="ss-input"
                type="date"
                readOnly={!canEdit}
                defaultValue={e.installed_on ?? ""}
                onBlur={(ev) => void patch(e.id, { installed_on: ev.target.value || null })}
              />
            </div>
            <div className="w-[140px]">
              <label className="ss-label">Warranty ends</label>
              <input
                className="ss-input"
                type="date"
                readOnly={!canEdit}
                defaultValue={e.warranty_expires_on ?? ""}
                onBlur={(ev) => void patch(e.id, { warranty_expires_on: ev.target.value || null })}
              />
            </div>
            <div className="w-[140px]">
              <label className="ss-label">Last serviced</label>
              <input
                className="ss-input"
                type="date"
                readOnly={!canEdit}
                defaultValue={e.last_serviced_on ?? ""}
                onBlur={(ev) => void patch(e.id, { last_serviced_on: ev.target.value || null })}
              />
            </div>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <Chip tone={KIND_TONE[e.kind] ?? "ink"}>
              <Wrench size={9} /> {KIND_LABEL[e.kind] ?? e.kind}
            </Chip>
            <Chip tone={CONDITION_TONE[e.condition] ?? "ink"}>{e.condition.replace(/_/g, " ")}</Chip>
            {e.brand && <Chip tone="ink">{[e.brand, e.model].filter(Boolean).join(" ")}</Chip>}
            {e.warranty_expires_on && (
              <Chip tone={new Date(e.warranty_expires_on) > new Date() ? "green" : "burgundy"}>
                warranty {new Date(e.warranty_expires_on).toLocaleDateString()}
              </Chip>
            )}
          </div>

          <textarea
            className="ss-input mt-2 text-[0.78rem]"
            rows={2}
            readOnly={!canEdit}
            placeholder="Notes for this unit — settings, quirks, repairs done"
            defaultValue={e.notes ?? ""}
            onBlur={(ev) => void patch(e.id, { notes: ev.target.value || null })}
          />

          <div className="mt-2 flex flex-wrap items-center gap-2">
            {e.photos.map((p) => (
              <div key={p.path} className="relative">
                <img
                  src={signed[p.path]}
                  alt={`${e.name} — ${p.name}`}
                  className="h-20 w-20 object-cover"
                  loading="lazy"
                />
                {canEdit && (
                  <button
                    className="ss-btn ss-btn-ghost absolute right-0 top-0 p-0.5"
                    aria-label="Remove photo"
                    onClick={() => void removePhoto(e, p.path)}
                  >
                    <X size={11} />
                  </button>
                )}
              </div>
            ))}
            {canEdit && (
              <>
                <input
                  ref={(el) => {
                    fileRefs.current[e.id] = el;
                  }}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(ev) => void upload(e, ev.target.files)}
                />
                <button
                  className="ss-btn ss-btn-ghost"
                  disabled={busy}
                  onClick={() => fileRefs.current[e.id]?.click()}
                >
                  <Camera size={13} /> Add photos
                </button>
              </>
            )}
          </div>
        </div>
      ))}

      {canEdit && (
        <div className="flex flex-wrap gap-2">
          {EQUIPMENT_KINDS.map((k) => (
            <button key={k} className="ss-btn ss-btn-ghost" disabled={busy} onClick={() => void add(k)}>
              <Plus size={13} /> Add {KIND_LABEL[k]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
