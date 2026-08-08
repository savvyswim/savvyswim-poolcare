import { useCallback, useEffect, useState } from "react";
import { Pause, Play, Timer } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSavvyIdentity } from "@/crm/lib/useSavvy";

type Running = { id: string; started_at: string; hourly_rate: number };

const elapsedMinutes = (startedAt: string) =>
  Math.max(0, Math.round((Date.now() - new Date(startedAt).getTime()) / 60000));

/**
 * Automatic time tracking: one tap starts the clock on a job, one tap stops it
 * and writes the exact minutes worked (source = "auto") into job costing.
 */
export default function JobTimer({ jobId, onChange }: { jobId: string; onChange?: () => void }) {
  const id = useSavvyIdentity();
  const [running, setRunning] = useState<Running | null>(null);
  const [tick, setTick] = useState(0);
  const [rate, setRate] = useState("35");

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("ss_job_time_entries")
      .select("id,started_at,hourly_rate")
      .eq("job_id", jobId)
      .is("ended_at", null)
      .not("started_at", "is", null)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setRunning((data as Running | null) ?? null);
  }, [jobId]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setTick((n) => n + 1), 15000);
    return () => clearInterval(t);
  }, [running]);

  async function start() {
    const { data, error } = await supabase
      .from("ss_job_time_entries")
      .insert({
        job_id: jobId,
        minutes: 0,
        hourly_rate: Number(rate) || 0,
        started_at: new Date().toISOString(),
        source: "auto",
        staff_id: id.staffId,
      })
      .select("id,started_at,hourly_rate")
      .single();
    if (error) { toast.error(error.message); return; }
    setRunning(data as Running);
    toast.success("Clocked in");
  }

  async function stop() {
    if (!running) return;
    const minutes = Math.max(1, elapsedMinutes(running.started_at));
    const { error } = await supabase
      .from("ss_job_time_entries")
      .update({ ended_at: new Date().toISOString(), minutes })
      .eq("id", running.id);
    if (error) { toast.error(error.message); return; }
    setRunning(null);
    toast.success(`Logged ${minutes} min`);
    onChange?.();
  }

  const live = running ? elapsedMinutes(running.started_at) + tick * 0 : 0;

  return (
    <div className="flex flex-wrap items-center gap-2 border p-2 text-[0.78rem]">
      <Timer size={14} />
      {running ? (
        <>
          <span>
            Running · <strong>{Math.floor(live / 60)}h {live % 60}m</strong>
          </span>
          <button className="ss-btn" onClick={() => void stop()}>
            <Pause size={13} /> Clock out
          </button>
        </>
      ) : (
        <>
          <span className="opacity-70">Auto time</span>
          <input className="ss-input w-20" type="number" min={0} value={rate}
            onChange={(e) => setRate(e.target.value)} aria-label="Hourly rate" />
          <button className="ss-btn" onClick={() => void start()}>
            <Play size={13} /> Clock in
          </button>
        </>
      )}
    </div>
  );
}
