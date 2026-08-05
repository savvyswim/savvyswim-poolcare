import { supabase } from "@/integrations/supabase/client";
import { Chip, EmptyState, SectionTitle } from "@/crm/components/Brand";
import { useTable } from "@/crm/lib/useSavvy";

type Staff = {
  id: string; full_name: string; email: string | null; phone: string | null;
  level: string; initials: string | null; is_active: boolean;
};

export default function Technicians() {
  const { rows } = useTable<Staff>("staff", async () => {
    const { data } = await supabase
      .from("ss_staff")
      .select("id,full_name,email,phone,level,initials,is_active")
      .order("level")
      .order("full_name");
    return (data ?? []) as Staff[];
  });

  return (
    <div className="space-y-4">
      <SectionTitle title="Team" sub={`${rows.filter((r) => r.is_active).length} active members`} />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {!rows.length && <EmptyState>No staff records.</EmptyState>}
        {rows.map((s) => (
          <div key={s.id} className="ss-card flex items-center gap-3 p-3.5">
            <div
              className="ss-num flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[0.85rem] font-bold"
              style={{ background: "hsl(var(--ss-burgundy))", color: "#fff" }}
            >
              {s.initials ?? s.full_name.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[0.9rem] font-semibold">{s.full_name}</div>
              <div className="truncate text-[0.73rem] opacity-65">{s.email} · {s.phone}</div>
              <div className="mt-1 flex gap-1.5">
                <Chip tone={s.level === "owner" ? "burgundy" : s.level === "office_manager" ? "gold" : "aqua"}>
                  {s.level.replace("_", " ")}
                </Chip>
                <Chip tone={s.is_active ? "green" : "orange"}>{s.is_active ? "active" : "inactive"}</Chip>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
