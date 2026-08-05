import { useMemo } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Chip, EmptyState, SectionTitle } from "@/crm/components/Brand";
import { useTable } from "@/crm/lib/useSavvy";

type Alert = {
  id: string; priority: string; title: string; body: string | null;
  is_resolved: boolean; created_at: string; customer_id: string | null;
  ss_customers: { full_name: string; city: string | null } | null;
};

const TONE: Record<string, "burgundy" | "orange" | "aqua"> = {
  HIGH: "burgundy",
  MED: "orange",
  LOW: "aqua",
};

export default function Alerts() {
  const { rows, refetch } = useTable<Alert>("alerts", async () => {
    const { data } = await supabase
      .from("ss_alerts")
      .select("id,priority,title,body,is_resolved,created_at,customer_id,ss_customers(full_name,city)")
      .order("created_at", { ascending: false })
      .limit(100);
    return (data ?? []) as unknown as Alert[];
  });

  const open = useMemo(() => rows.filter((a) => !a.is_resolved), [rows]);
  const resolved = useMemo(() => rows.filter((a) => a.is_resolved), [rows]);

  async function resolve(a: Alert) {
    const { error } = await supabase
      .from("ss_alerts")
      .update({ is_resolved: true, resolved_at: new Date().toISOString() })
      .eq("id", a.id);
    if (error) return toast.error(error.message);
    toast.success("Alert resolved");
    void refetch();
  }

  return (
    <div className="space-y-4">
      <SectionTitle title="Alerts" sub={`${open.length} needing attention`} />
      <div className="space-y-2">
        {!open.length && <EmptyState>All clear — nothing open.</EmptyState>}
        {open.map((a) => (
          <div key={a.id} className="ss-card flex flex-wrap items-start gap-3 p-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <Chip tone={TONE[a.priority] ?? "aqua"}>{a.priority}</Chip>
                <span className="text-[0.9rem] font-semibold">{a.title}</span>
              </div>
              <div className="text-[0.74rem] opacity-65">
                {a.ss_customers?.full_name ?? "—"} · {new Date(a.created_at).toLocaleString()}
              </div>
              {a.body && <div className="mt-1 text-[0.82rem]">{a.body}</div>}
            </div>
            <button className="ss-btn" onClick={() => resolve(a)}>Resolve</button>
          </div>
        ))}
      </div>

      {!!resolved.length && (
        <>
          <div className="ss-label pt-2">Recently resolved</div>
          <div className="space-y-1.5">
            {resolved.slice(0, 10).map((a) => (
              <div key={a.id} className="ss-card p-2.5 text-[0.8rem] opacity-60">
                {a.title} — {a.ss_customers?.full_name ?? "—"}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
