import { useCallback, useEffect, useState } from "react";
import { Activity, Loader2, PlayCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Chip } from "@/crm/components/Brand";

type Run = {
  id: string;
  started_at: string;
  target: string;
  source: string;
  rounds: number;
  requests: number;
  failures: number;
  slowest_ms: number;
  status: string;
};

type Incident = {
  id: string;
  run_id: string;
  occurred_at: string;
  route: string;
  round: number;
  kind: string;
  http_status: number | null;
  duration_ms: number;
  message: string | null;
  stack: string | null;
  body_snippet: string | null;
};

const when = (v: string) =>
  new Date(v).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

export default function CanaryPanel() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  const load = useCallback(async () => {
    const [{ data: runData }, { data: incidentData }] = await Promise.all([
      supabase.from("ss_canary_runs").select("*").order("started_at", { ascending: false }).limit(15),
      supabase.from("ss_canary_incidents").select("*").order("occurred_at", { ascending: false }).limit(25),
    ]);
    setRuns((runData ?? []) as Run[]);
    setIncidents((incidentData ?? []) as Incident[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const runNow = async () => {
    setRunning(true);
    try {
      const res = await fetch("/api/public/hooks/canary?rounds=2&source=manual", { method: "POST" });
      const body = (await res.json()) as { status: string; failures: number; requests: number };
      toast[body.status === "ok" ? "success" : "error"](
        `Canary: ${body.status} — ${body.failures}/${body.requests} failing`,
      );
      await load();
    } catch {
      toast.error("Could not run the canary");
    } finally {
      setRunning(false);
    }
  };

  return (
    <section className="crm-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4" />
          <h2 className="crm-h2">Post-deploy canary</h2>
        </div>
        <button type="button" className="crm-btn" onClick={runNow} disabled={running}>
          {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
          Run canary
        </button>
      </div>
      <p className="crm-sub mt-1">
        Hits the live site repeatedly and captures the status, timing, stack trace and response body for any
        request that 5xxs, times out or renders a crash page.
      </p>

      {loading ? (
        <p className="crm-sub mt-3">Loading…</p>
      ) : (
        <>
          {!runs.length ? (
            <p className="crm-sub mt-3">No canary runs recorded yet.</p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase opacity-60">
                  <tr>
                    <th className="py-2">When</th>
                    <th>Status</th>
                    <th>Requests</th>
                    <th>Failing</th>
                    <th>Slowest</th>
                    <th>Source</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map((r) => (
                    <tr key={r.id} className="border-t border-black/10">
                      <td className="py-2 whitespace-nowrap">{when(r.started_at)}</td>
                      <td>
                        <Chip tone={r.status === "ok" ? "aqua" : "burgundy"}>{r.status}</Chip>
                      </td>
                      <td>{r.requests}</td>
                      <td>{r.failures}</td>
                      <td>{r.slowest_ms}ms</td>
                      <td className="max-w-[140px] truncate">{r.source}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <h3 className="crm-h2 mt-5 text-base">Captured failures</h3>
          {!incidents.length ? (
            <p className="crm-sub mt-2">No failures captured — every canary request came back clean.</p>
          ) : (
            <ul className="mt-2 space-y-3">
              {incidents.map((i) => (
                <li key={i.id} className="border border-black/10 p-3">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <Chip tone="burgundy">{i.kind}</Chip>
                    <span className="font-mono">{i.route}</span>
                    <span className="opacity-70">
                      HTTP {i.http_status ?? "—"} · {i.duration_ms}ms · round {i.round} · {when(i.occurred_at)}
                    </span>
                  </div>
                  {i.message && <p className="mt-1 text-sm">{i.message}</p>}
                  {(i.stack || i.body_snippet) && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-xs uppercase tracking-wide opacity-70">
                        {i.stack ? "Stack trace" : "Response snippet"}
                      </summary>
                      <pre className="mt-2 max-h-64 overflow-auto bg-black/5 p-2 text-xs whitespace-pre-wrap">
                        {i.stack ?? i.body_snippet}
                      </pre>
                    </details>
                  )}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
