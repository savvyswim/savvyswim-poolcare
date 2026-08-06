import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Chip, EmptyState, SectionTitle } from "@/crm/components/Brand";
import { useTable } from "@/crm/lib/useSavvy";

type Truck = { id: string; name: string; assigned_tech_id: string | null };
type Staff = { id: string; full_name: string; level: string };

export default function Trucks() {
  const { rows: trucks, refetch } = useTable<Truck>("trucks", async () => {
    const { data } = await supabase.from("ss_trucks").select("id,name,assigned_tech_id").order("name");
    return (data ?? []) as Truck[];
  });
  const { rows: staff } = useTable<Staff>("truck-staff", async () => {
    const { data } = await supabase.from("ss_staff").select("id,full_name,level").eq("is_active", true).order("full_name");
    return (data ?? []) as Staff[];
  });

  async function assign(truck: Truck, techId: string) {
    const { error } = await supabase
      .from("ss_trucks")
      .update({ assigned_tech_id: techId || null })
      .eq("id", truck.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Truck assignment updated");
    void refetch();
  }

  return (
    <div className="space-y-4">
      <SectionTitle title="Trucks & tools" sub={`${trucks.length} vehicles in service`} />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {!trucks.length && <EmptyState>No trucks recorded.</EmptyState>}
        {trucks.map((t) => {
          const tech = staff.find((s) => s.id === t.assigned_tech_id);
          return (
            <div key={t.id} className="ss-card p-3.5">
              <div className="flex items-center justify-between">
                <span className="text-[0.95rem] font-semibold" style={{ color: "hsl(var(--ss-burgundy))" }}>{t.name}</span>
                <Chip tone={tech ? "green" : "orange"}>{tech ? "assigned" : "open"}</Chip>
              </div>
              <label className="ss-label mt-3 block">Assigned technician</label>
              <select className="ss-input" value={t.assigned_tech_id ?? ""} onChange={(e) => assign(t, e.target.value)}>
                <option value="">Unassigned</option>
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>{s.full_name}</option>
                ))}
              </select>
            </div>
          );
        })}
      </div>
    </div>
  );
}
