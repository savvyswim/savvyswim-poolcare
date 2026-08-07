import { useState } from "react";
import { Droplets, Plus, Trash2, Waves } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Chip, EmptyState } from "@/crm/components/Brand";
import { useWaterBodies, WATER_BODY_KINDS, type WaterBody } from "@/crm/lib/serviceConfig";

const KIND_LABEL: Record<string, string> = {
  pool: "Pool",
  spa: "Spa / hot tub",
  water_feature: "Water feature",
};

const KIND_TONE: Record<string, "aqua" | "burgundy" | "green"> = {
  pool: "aqua",
  spa: "burgundy",
  water_feature: "green",
};

/**
 * Every property can carry more than one body of water. Each one keeps its
 * own volume, surface and sanitizer so the visit sheet can log separate
 * readings and dose each body on its own gallons.
 */
export default function WaterBodies({
  customerId,
  canEdit,
}: {
  customerId: string;
  canEdit: boolean;
}) {
  const { rows, refetch } = useWaterBodies(customerId);
  const [busy, setBusy] = useState(false);

  async function patch(id: string, p: Partial<WaterBody>) {
    const { error } = await supabase.from("ss_water_bodies").update(p as never).eq("id", id);
    if (error) toast.error(error.message);
    else refetch();
  }

  async function add(kind: string) {
    setBusy(true);
    const { error } = await supabase.from("ss_water_bodies").insert({
      customer_id: customerId,
      name: KIND_LABEL[kind] ?? "Body of water",
      kind,
      gallons: kind === "spa" ? 500 : 0,
      sort_order: (rows.at(-1)?.sort_order ?? 0) + 1,
    } as never);
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      toast.success(`${KIND_LABEL[kind]} added`);
      refetch();
    }
  }

  async function remove(id: string) {
    const { error } = await supabase.from("ss_water_bodies").delete().eq("id", id);
    if (error) toast.error(error.message);
    else refetch();
  }

  return (
    <div className="space-y-2">
      <div className="ss-card p-3 text-[0.78rem] opacity-70">
        <Waves size={13} className="mr-1 inline" /> Techs log separate readings and dosing for each body of
        water on this property.
      </div>

      {!rows.length && <EmptyState>No bodies of water yet — add the pool to get started.</EmptyState>}

      {rows.map((b) => (
        <div key={b.id} className="ss-card p-3">
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-[150px] flex-1">
              <label className="ss-label">Name</label>
              <input
                className="ss-input"
                readOnly={!canEdit}
                defaultValue={b.name}
                onBlur={(e) => e.target.value !== b.name && void patch(b.id, { name: e.target.value })}
              />
            </div>
            <div className="w-[140px]">
              <label className="ss-label">Type</label>
              <select
                className="ss-input"
                disabled={!canEdit}
                value={b.kind}
                onChange={(e) => void patch(b.id, { kind: e.target.value })}
              >
                {WATER_BODY_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {KIND_LABEL[k]}
                  </option>
                ))}
              </select>
            </div>
            <div className="w-[110px]">
              <label className="ss-label">Gallons</label>
              <input
                className="ss-input ss-num"
                type="number"
                readOnly={!canEdit}
                defaultValue={b.gallons}
                onBlur={(e) => void patch(b.id, { gallons: Number(e.target.value) || 0 })}
              />
            </div>
            <div className="w-[130px]">
              <label className="ss-label">Surface</label>
              <input
                className="ss-input"
                readOnly={!canEdit}
                placeholder="Plaster, pebble…"
                defaultValue={b.surface ?? ""}
                onBlur={(e) => void patch(b.id, { surface: e.target.value || null })}
              />
            </div>
            <div className="w-[130px]">
              <label className="ss-label">Sanitizer</label>
              <input
                className="ss-input"
                readOnly={!canEdit}
                placeholder="Chlorine, salt…"
                defaultValue={b.sanitizer ?? ""}
                onBlur={(e) => void patch(b.id, { sanitizer: e.target.value || null })}
              />
            </div>
            {canEdit && (
              <button className="ss-btn ss-btn-ghost" aria-label="Remove" onClick={() => void remove(b.id)}>
                <Trash2 size={13} />
              </button>
            )}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <Chip tone={KIND_TONE[b.kind] ?? "ink"}>
              <Droplets size={9} /> {KIND_LABEL[b.kind] ?? b.kind}
            </Chip>
            <Chip tone="ink">{b.gallons.toLocaleString()} gal</Chip>
            {b.sanitizer && <Chip tone="gold">{b.sanitizer}</Chip>}
          </div>
          <input
            className="ss-input mt-2 text-[0.78rem]"
            readOnly={!canEdit}
            placeholder="Notes for this body of water"
            defaultValue={b.notes ?? ""}
            onBlur={(e) => void patch(b.id, { notes: e.target.value || null })}
          />
        </div>
      ))}

      {canEdit && (
        <div className="flex flex-wrap gap-2">
          {WATER_BODY_KINDS.map((k) => (
            <button key={k} className="ss-btn ss-btn-ghost" disabled={busy} onClick={() => void add(k)}>
              <Plus size={13} /> Add {KIND_LABEL[k]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
