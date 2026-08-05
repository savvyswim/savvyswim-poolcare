import { useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Chip, EmptyState, SectionTitle } from "@/crm/components/Brand";
import { useTable } from "@/crm/lib/useSavvy";
import { money } from "@/crm/lib/pricing";

type Item = {
  id: string; name: string; sku: string | null; category: string | null;
  unit: string | null; qty_on_hand: number; reorder_at: number; unit_cost: number | null;
};

export default function Inventory() {
  const [q, setQ] = useState("");

  const { rows, refetch } = useTable<Item>("inventory", async () => {
    const { data } = await supabase
      .from("ss_inventory")
      .select("id,name,sku,category,unit,qty_on_hand,reorder_at,unit_cost")
      .order("name");
    return (data ?? []) as Item[];
  });

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return rows.filter((r) => !t || `${r.name} ${r.sku ?? ""} ${r.category ?? ""}`.toLowerCase().includes(t));
  }, [rows, q]);

  const low = rows.filter((r) => r.qty_on_hand <= r.reorder_at);
  const value = rows.reduce((s, r) => s + Number(r.unit_cost ?? 0) * r.qty_on_hand, 0);

  async function adjust(item: Item, delta: number) {
    const next = Math.max(0, item.qty_on_hand + delta);
    const { error } = await supabase.from("ss_inventory").update({ qty_on_hand: next }).eq("id", item.id);
    if (error) return toast.error(error.message);
    void refetch();
  }

  return (
    <div className="space-y-4">
      <SectionTitle title="Inventory" sub={`${rows.length} items · ${money(value)} on hand · ${low.length} low`} />

      <input className="ss-input" placeholder="Search items" value={q} onChange={(e) => setQ(e.target.value)} />

      <div className="space-y-2">
        {!shown.length && <EmptyState>No items.</EmptyState>}
        {shown.map((i) => (
          <div key={i.id} className="ss-card flex flex-wrap items-center gap-3 p-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[0.88rem] font-semibold">{i.name}</span>
                {i.qty_on_hand <= i.reorder_at && <Chip tone="orange">Reorder</Chip>}
              </div>
              <div className="text-[0.72rem] opacity-60">
                {i.sku ?? "—"} · {i.category ?? "—"} · {money(i.unit_cost ?? 0)}/{i.unit ?? "unit"}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="ss-btn ss-btn-ghost" onClick={() => adjust(i, -1)} aria-label="Decrease">−</button>
              <span className="ss-num w-12 text-center text-[1rem] font-bold">{i.qty_on_hand}</span>
              <button className="ss-btn ss-btn-ghost" onClick={() => adjust(i, 1)} aria-label="Increase">+</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
