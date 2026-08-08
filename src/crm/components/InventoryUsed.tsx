import { useEffect, useMemo, useState } from "react";
import { Boxes, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { money2 } from "@/crm/lib/pricing";
import { convertQty, enterableUnits, packLabel } from "@/crm/lib/units";

export type UsedItem = {
  item_id: string;
  name: string;
  unit: string;
  /** Quantity as typed, in `entry_unit`. */
  qty: number;
  /** Unit the tech typed in — converted to `unit` before stock is drawn down. */
  entry_unit: string;
  unit_cost: number;
  on_hand: number;
  pack_size: number | null;
  pack_unit: string | null;
};

type InvItem = {
  id: string; name: string; unit: string; quantity: number; unit_cost: number;
  pack_size: number | null; pack_unit: string | null;
};

/** Quantity in the item's own stock unit, after applying the conversion rule. */
export function stockQty(r: UsedItem): number {
  const q = convertQty(Number(r.qty) || 0, r.entry_unit || r.unit, r.unit, r);
  return q ?? 0;
}

export function usedTotal(rows: UsedItem[]) {
  return rows.reduce((s, r) => s + stockQty(r) * (Number(r.unit_cost) || 0), 0);
}

/**
 * Lets a tech log the truck stock actually consumed on this stop. Quantities
 * can be entered in any convertible unit (gal, lb, bag…) and are written
 * through ss_log_inventory_usage on save, which converts to the item's stock
 * unit, decrements on-hand, and records the visit on every move.
 */
export default function InventoryUsed({
  rows,
  onChange,
}: {
  rows: UsedItem[];
  onChange: (next: UsedItem[]) => void;
}) {
  const [items, setItems] = useState<InvItem[]>([]);
  const [pick, setPick] = useState("");

  useEffect(() => {
    void (async () => {
      const { data } = await supabase
        .from("ss_inventory")
        .select("id,name,unit,quantity,unit_cost,pack_size,pack_unit")
        .order("name");
      setItems((data ?? []) as InvItem[]);
    })();
  }, []);

  const available = useMemo(
    () => items.filter((i) => !rows.some((r) => r.item_id === i.id)),
    [items, rows],
  );

  function add() {
    const it = items.find((i) => i.id === pick);
    if (!it) return;
    onChange([
      ...rows,
      {
        item_id: it.id,
        name: it.name,
        unit: it.unit,
        qty: 1,
        entry_unit: it.unit,
        unit_cost: Number(it.unit_cost) || 0,
        on_hand: Number(it.quantity) || 0,
        pack_size: it.pack_size ?? null,
        pack_unit: it.pack_unit ?? null,
      },
    ]);
    setPick("");
  }

  const total = usedTotal(rows);

  return (
    <div className="ss-card p-3">
      <div className="flex items-center justify-between">
        <div className="ss-tag flex items-center gap-1" style={{ fontSize: "0.55rem" }}>
          <Boxes size={12} /> Inventory used
        </div>
        {rows.length > 0 && <span className="ss-num text-[0.76rem]">{money2(total)}</span>}
      </div>

      <div className="mt-2 space-y-2">
        {rows.map((r, idx) => {
          const inStock = stockQty(r);
          const short = inStock > r.on_hand;
          const units = enterableUnits(r.unit, r);
          const converted = r.entry_unit !== r.unit;
          return (
            <div key={r.item_id} className="flex items-center gap-2 text-[0.78rem]">
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold">{r.name}</div>
                <div className="opacity-60">
                  {r.on_hand} {r.unit} on hand · {money2(r.unit_cost)}/{r.unit}
                  {packLabel(r, r.unit) && ` · ${packLabel(r, r.unit)}`}
                  {converted && (
                    <span className="ml-1 font-semibold">
                      → {Math.round(inStock * 1000) / 1000} {r.unit}
                    </span>
                  )}
                  {short && <span className="ml-1 font-semibold text-[hsl(var(--ss-burgundy))]">over stock</span>}
                </div>
              </div>
              <input
                className="ss-input ss-num w-20 text-right"
                type="number"
                min={0}
                step="0.25"
                value={r.qty}
                onChange={(e) => {
                  const next = [...rows];
                  next[idx] = { ...r, qty: Math.max(0, Number(e.target.value) || 0) };
                  onChange(next);
                }}
              />
              <select
                className="ss-input w-[74px]"
                aria-label={`Unit for ${r.name}`}
                value={r.entry_unit}
                onChange={(e) => {
                  const next = [...rows];
                  next[idx] = { ...r, entry_unit: e.target.value };
                  onChange(next);
                }}
              >
                {units.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
              <button
                type="button"
                className="opacity-60"
                aria-label={`Remove ${r.name}`}
                onClick={() => onChange(rows.filter((x) => x.item_id !== r.item_id))}
              >
                <Trash2 size={14} />
              </button>
            </div>
          );
        })}

        <div className="flex items-center gap-2">
          <select className="ss-input flex-1" value={pick} onChange={(e) => setPick(e.target.value)}>
            <option value="">Add an item used…</option>
            {available.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name} ({i.quantity} {i.unit})
              </option>
            ))}
          </select>
          <button type="button" className="ss-btn-ghost flex items-center gap-1" disabled={!pick} onClick={add}>
            <Plus size={13} /> Add
          </button>
        </div>
      </div>
    </div>
  );
}
