import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ClipboardList, ShoppingCart, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Chip, EmptyState } from "@/crm/components/Brand";
import { money2 } from "@/crm/lib/pricing";

export type ReorderItem = {
  id: string;
  name: string;
  unit: string | null;
  quantity: number;
  low_threshold: number;
  unit_cost: number;
  sku: string | null;
};

type Line = { item_id: string; name: string; sku: string | null; unit: string; qty: number; unit_cost: number };

/** Suggests enough stock to land at twice the reorder point. */
function suggestQty(i: ReorderItem) {
  const target = Math.max(i.low_threshold * 2, i.low_threshold + 1, 1);
  return Math.max(1, Math.ceil(target - Number(i.quantity || 0)));
}

/**
 * One-click reorder: turns everything currently at or below its reorder point
 * into an editable draft purchase order saved to ss_purchase_orders.
 */
export default function ReorderDraft({
  lowItems,
  onClose,
  onCreated,
}: {
  lowItems: ReorderItem[];
  onClose: () => void;
  onCreated?: () => void;
}) {
  const [vendor, setVendor] = useState("Pool supply vendor");
  const [busy, setBusy] = useState(false);
  const [lines, setLines] = useState<Line[]>(() =>
    lowItems.map((i) => ({
      item_id: i.id,
      name: i.name,
      sku: i.sku,
      unit: i.unit ?? "ea",
      qty: suggestQty(i),
      unit_cost: Number(i.unit_cost) || 0,
    })),
  );

  const total = useMemo(
    () => lines.reduce((s, l) => s + (Number(l.qty) || 0) * (Number(l.unit_cost) || 0), 0),
    [lines],
  );

  function patch(idx: number, next: Partial<Line>) {
    setLines((prev) => prev.map((l, k) => (k === idx ? { ...l, ...next } : l)));
  }

  async function create() {
    const items = lines.filter((l) => Number(l.qty) > 0);
    if (!items.length) { toast.error("Add a quantity to at least one item."); return; }
    if (!vendor.trim()) { toast.error("Who is this order going to?"); return; }
    setBusy(true);
    const { error } = await supabase.from("ss_purchase_orders").insert({
      vendor: vendor.trim(),
      status: "draft",
      total: Math.round(total * 100) / 100,
      items,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`Draft PO created · ${items.length} item(s) · ${money2(total)}`);
    onCreated?.();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[85] flex items-start justify-center overflow-auto p-4">
      <div className="absolute inset-0 bg-black/55" onClick={onClose} />
      <div className="savvy-crm relative my-6 w-full max-w-2xl p-5" style={{ background: "hsl(var(--ss-cream))" }}>
        <div className="flex items-center justify-between">
          <span className="ss-tag flex items-center gap-1"><ShoppingCart size={12} /> Create reorder</span>
          <button onClick={onClose} aria-label="Close reorder"><X size={16} /></button>
        </div>

        <label className="mt-3 block space-y-1">
          <span className="ss-label">Vendor</span>
          <input className="ss-input w-full" value={vendor} onChange={(e) => setVendor(e.target.value)} />
        </label>

        <div className="mt-3 space-y-2">
          {!lines.length && <EmptyState>Nothing is below its reorder point.</EmptyState>}
          {lines.map((l, idx) => (
            <div key={l.item_id} className="flex flex-wrap items-center gap-2 border p-2.5" style={{ borderColor: "hsl(var(--ss-sand))" }}>
              <div className="min-w-0 flex-1">
                <div className="text-[0.84rem] font-semibold">{l.name}</div>
                <div className="ss-num text-[0.68rem] opacity-55">{l.sku ?? "—"} · per {l.unit}</div>
              </div>
              <label className="space-y-0.5">
                <span className="ss-label">Qty</span>
                <input
                  className="ss-input ss-num w-20 text-right"
                  type="number"
                  min={0}
                  step="1"
                  value={l.qty}
                  onChange={(e) => patch(idx, { qty: Math.max(0, Number(e.target.value) || 0) })}
                />
              </label>
              <label className="space-y-0.5">
                <span className="ss-label">Cost</span>
                <input
                  className="ss-input ss-num w-24 text-right"
                  type="number"
                  min={0}
                  step="0.01"
                  value={l.unit_cost}
                  onChange={(e) => patch(idx, { unit_cost: Math.max(0, Number(e.target.value) || 0) })}
                />
              </label>
              <span className="ss-num w-20 text-right text-[0.8rem]">{money2(l.qty * l.unit_cost)}</span>
              <button className="opacity-60" aria-label={`Remove ${l.name}`} onClick={() => setLines(lines.filter((_, k) => k !== idx))}>
                <X size={14} />
              </button>
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Chip tone="green">{money2(total)} total</Chip>
            <span className="text-[0.72rem] opacity-60">{lines.length} line(s)</span>
          </div>
          <div className="flex gap-2">
            <button className="ss-btn" disabled={busy || !lines.length} onClick={() => void create()}>
              <ClipboardList size={13} /> Create draft PO
            </button>
            <button className="ss-btn ss-btn-ghost" onClick={onClose}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}
