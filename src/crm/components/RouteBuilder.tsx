import { useMemo, useState } from "react";
import { toast } from "sonner";
import { CalendarPlus, Wand2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Chip, EmptyState } from "@/crm/components/Brand";

type Cust = {
  id: string; full_name: string; address: string | null; city: string | null;
  route_day: string | null; assigned_tech_id: string | null; status: string;
};
type Tech = { id: string; full_name: string; level: string };

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const dayName = (iso: string) =>
  DAYS[(new Date(`${iso}T12:00:00`).getDay() + 6) % 7] ?? "Monday";

/** Office-only tool: turn the customer book into dated route stops. */
export default function RouteBuilder({ techs, onBuilt }: { techs: Tech[]; onBuilt: () => void }) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [day, setDay] = useState(dayName(new Date().toISOString().slice(0, 10)));
  const [techId, setTechId] = useState("");
  const [customers, setCustomers] = useState<Cust[]>([]);
  const [picked, setPicked] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const selected = useMemo(() => customers.filter((c) => picked[c.id]), [customers, picked]);

  const loadDay = async (nextDay: string) => {
    setDay(nextDay);
    setLoading(true);
    const { data, error } = await supabase
      .from("ss_customers")
      .select("id,full_name,address,city,route_day,assigned_tech_id,status")
      .eq("status", "active")
      .eq("route_day", nextDay)
      .order("full_name");
    setLoading(false);
    if (error) return toast.error("Could not load customers for that day");
    const rows = (data ?? []) as Cust[];
    setCustomers(rows);
    setPicked(Object.fromEntries(rows.map((r) => [r.id, true])));
  };

  const openPanel = async () => {
    setOpen(true);
    if (!customers.length) await loadDay(day);
  };

  const build = async () => {
    if (!selected.length) return toast.error("Pick at least one stop");
    setSaving(true);
    try {
      const { data: existing } = await supabase
        .from("ss_visits")
        .select("customer_id")
        .eq("scheduled_date", date);
      const already = new Set((existing ?? []).map((v) => v.customer_id));
      const rows = selected
        .filter((c) => !already.has(c.id))
        .map((c, i) => ({
          customer_id: c.id,
          tech_id: techId || c.assigned_tech_id || null,
          scheduled_date: date,
          stop_order: i + 1,
          status: "pending",
        }));
      if (!rows.length) {
        toast.info("Those stops are already scheduled for that date");
        return;
      }
      const { error } = await supabase.from("ss_visits").insert(rows);
      if (error) throw error;
      toast.success(`${rows.length} stops added to ${new Date(`${date}T12:00:00`).toLocaleDateString()}`);
      setOpen(false);
      onBuilt();
    } catch (err: any) {
      toast.error(err?.message ?? "Could not build the route");
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <button className="ss-btn" onClick={openPanel}>
        <CalendarPlus size={13} /> Build route
      </button>
    );
  }

  return (
    <div className="ss-card w-full space-y-3 p-4">
      <div className="flex items-center gap-2">
        <Wand2 size={15} />
        <div className="ss-label">Build a route</div>
        <span className="flex-1" />
        <button className="ss-btn ss-btn-ghost" onClick={() => setOpen(false)}>Close</button>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <div>
          <label className="ss-label">Service date</label>
          <input
            className="ss-input"
            type="date"
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              void loadDay(dayName(e.target.value));
            }}
          />
        </div>
        <div>
          <label className="ss-label">Route day</label>
          <select className="ss-input" value={day} onChange={(e) => void loadDay(e.target.value)}>
            {DAYS.map((d) => <option key={d}>{d}</option>)}
          </select>
        </div>
        <div>
          <label className="ss-label">Assign to</label>
          <select className="ss-input" value={techId} onChange={(e) => setTechId(e.target.value)}>
            <option value="">Keep each customer's tech</option>
            {techs.map((t) => <option key={t.id} value={t.id}>{t.full_name}</option>)}
          </select>
        </div>
      </div>

      <div className="max-h-72 space-y-1.5 overflow-auto">
        {loading && <EmptyState>Loading customers…</EmptyState>}
        {!loading && !customers.length && (
          <EmptyState>No active customers set to {day}. Set a route day on the customer record first.</EmptyState>
        )}
        {customers.map((c, i) => (
          <label key={c.id} className="flex items-center gap-2 text-[0.82rem]">
            <input
              type="checkbox"
              checked={!!picked[c.id]}
              onChange={(e) => setPicked((p) => ({ ...p, [c.id]: e.target.checked }))}
            />
            <span className="ss-num opacity-40" style={{ width: 20 }}>{i + 1}</span>
            <span className="font-semibold">{c.full_name}</span>
            <span className="truncate opacity-60">{[c.address, c.city].filter(Boolean).join(", ")}</span>
            <span className="flex-1" />
            {!c.assigned_tech_id && !techId && <Chip tone="orange">no tech</Chip>}
          </label>
        ))}
      </div>

      <button className="ss-btn w-full" disabled={saving || !selected.length} onClick={build}>
        {saving ? "Building…" : `Add ${selected.length} stops to the route`}
      </button>
    </div>
  );
}
