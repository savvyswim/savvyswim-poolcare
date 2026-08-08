import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSavvyIdentity } from "@/crm/lib/useSavvy";

type Schedule = {
  id: string;
  appointment_type: string;
  offsets_hours: number[];
  enabled: boolean;
};

const parseOffsets = (raw: string): number[] =>
  Array.from(
    new Set(
      raw
        .split(/[,\s]+/)
        .map((v) => Number(v.replace(/h$/i, "")))
        .filter((n) => Number.isFinite(n) && n > 0 && n <= 336)
        .map((n) => Math.round(n)),
    ),
  ).sort((a, b) => b - a);

/**
 * Reminder lead times per appointment type (48h / 24h / 2h etc.). The hourly
 * reminder sweep reads these rows; "default" covers anything without its own line.
 */
export default function ReminderSchedules() {
  const { level } = useSavvyIdentity();
  const canEdit = level === "owner" || level === "office_manager";
  const [rows, setRows] = useState<Schedule[]>([]);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [newType, setNewType] = useState("");

  async function load() {
    const { data } = await supabase
      .from("ss_reminder_schedules")
      .select("id, appointment_type, offsets_hours, enabled")
      .order("appointment_type");
    const list = (data ?? []) as Schedule[];
    setRows(list);
    setDraft(Object.fromEntries(list.map((r) => [r.id, (r.offsets_hours ?? []).join(", ")])));
  }

  useEffect(() => {
    void load();
  }, []);

  async function save(row: Schedule) {
    const offsets = parseOffsets(draft[row.id] ?? "");
    if (!offsets.length) {
      toast.error("Enter at least one lead time in hours (e.g. 48, 24, 2)");
      return;
    }
    const { error } = await supabase
      .from("ss_reminder_schedules")
      .update({ offsets_hours: offsets })
      .eq("id", row.id);
    if (error) { toast.error(error.message); return; }
    toast.success(`${row.appointment_type} reminders saved`);
    void load();
  }

  async function toggle(row: Schedule) {
    const { error } = await supabase
      .from("ss_reminder_schedules")
      .update({ enabled: !row.enabled })
      .eq("id", row.id);
    if (error) { toast.error(error.message); return; }
    void load();
  }

  async function addType() {
    const name = newType.trim();
    if (!name) return;
    const { error } = await supabase
      .from("ss_reminder_schedules")
      .insert({ appointment_type: name, offsets_hours: [24, 2] });
    if (error) { toast.error(error.message); return; }
    setNewType("");
    toast.success(`${name} added`);
    void load();
  }

  async function remove(row: Schedule) {
    if (row.appointment_type === "default") { toast.error("The default schedule can't be removed"); return; }
    const { error } = await supabase.from("ss_reminder_schedules").delete().eq("id", row.id);
    if (error) { toast.error(error.message); return; }
    void load();
  }

  return (
    <div className="ss-card p-4">
      <div className="ss-label mb-1">Reminder schedule</div>
      <p className="mb-3 text-[0.8rem] opacity-70">
        Hours before the arrival window that we text or email the customer, per appointment type.
        Example: <span className="ss-num">48, 24, 2</span>. The <strong>default</strong> line covers
        anything without its own schedule.
      </p>

      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.id} className="flex flex-wrap items-center gap-2 border-t border-black/10 pt-2">
            <div className="min-w-[9rem] text-[0.85rem] font-semibold">{r.appointment_type}</div>
            <input
              className="ss-input ss-num flex-1 min-w-[10rem]"
              readOnly={!canEdit}
              value={draft[r.id] ?? ""}
              placeholder="48, 24, 2"
              onChange={(e) => setDraft({ ...draft, [r.id]: e.target.value })}
            />
            <span className="text-[0.75rem] opacity-60">hours before</span>
            {canEdit && (
              <>
                <button className="ss-btn" onClick={() => save(r)}>Save</button>
                <button className="ss-btn" onClick={() => toggle(r)}>
                  {r.enabled ? "Pause" : "Resume"}
                </button>
                {r.appointment_type !== "default" && (
                  <button className="ss-btn" onClick={() => remove(r)}>Remove</button>
                )}
              </>
            )}
            {!r.enabled && <span className="text-[0.75rem] opacity-60">paused</span>}
          </div>
        ))}
      </div>

      {canEdit && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-black/10 pt-3">
          <input
            className="ss-input flex-1 min-w-[12rem]"
            placeholder="New appointment type (e.g. Filter Clean)"
            value={newType}
            onChange={(e) => setNewType(e.target.value)}
          />
          <button className="ss-btn" onClick={addType}>Add</button>
        </div>
      )}
    </div>
  );
}
