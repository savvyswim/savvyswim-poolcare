import { useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Chip, EmptyState, SectionTitle } from "@/crm/components/Brand";
import { useTable } from "@/crm/lib/useSavvy";

type Item = {
  id: string; name: string; unit: string | null; quantity: number; low_threshold: number;
};

export default function Inventory() {
  const [q, setQ] = useState("");

  const { rows, refetch } = useTable<Item>("inventory", async () => {
    const { data } = await supabase
      .from("ss_inventory")
      .select("id,name,unit,quantity,low_threshold")
      .order("name");
    return (data ?? []) as Item[];
  });

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return rows.filter((r) => !t || `${r.name} ${r.unit ?? ""}`.toLowerCase().includes(t));
  }, [rows, q]);

  const low = rows.filter((r) => r.quantity <= r.low_threshold);
  const totalUnits = rows.reduce((s, r) => s + r.quantity, 0);

  async function adjust(item: Item, delta: number) {
    const next = Math.max(0, item.quantity + delta);
    const { error } = await supabase.from("ss_inventory").update({ quantity: next }).eq("id", item.id);
    if (error) return toast.error(error.message);
    void refetch();
  }

  return (
    <div className="space-y-4">
      <SectionTitle title="Inventory" sub={`${rows.length} items · ${totalUnits} units on hand · ${low.length} low`} />

      <input className="ss-input" placeholder="Search items" value={q} onChange={(e) => setQ(e.target.value)} />

      <div className="space-y-2">
        {!shown.length && <EmptyState>No items.</EmptyState>}
        {shown.map((i) => (
          <div key={i.id} className="ss-card flex flex-wrap items-center gap-3 p-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[0.88rem] font-semibold">{i.name}</span>
                {i.quantity <= i.low_threshold && <Chip tone="orange">Reorder</Chip>}
              </div>
              <div className="text-[0.72rem] opacity-60">
                Reorder at {i.low_threshold} {i.unit ?? "units"}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="ss-btn ss-btn-ghost" onClick={() => adjust(i, -1)} aria-label="Decrease">−</button>
              <span className="ss-num w-12 text-center text-[1rem] font-bold">{i.quantity}</span>
              <button className="ss-btn ss-btn-ghost" onClick={() => adjust(i, 1)} aria-label="Increase">+</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
