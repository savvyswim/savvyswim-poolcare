import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Chip } from "@/crm/components/Brand";
import { buildRollbackChecklist, type DeployPing } from "@/lib/rollback-checklist";
import CanaryPanel from "@/crm/pages/CanaryPanel";

type Row = {
  id: string;
  checked_at: string;
  status: "ok" | "degraded" | "failed";
  http_status: number | null;
  boot_id: string | null;
  failed_checks: string[] | null;
  detail: string | null;
  alert_result: string | null;
  source: string;
};

type LiveHealth = {
  status: "ok" | "degraded" | "failed";
  bootId?: string;
  checkedAt: string;
  checks: { name: string; ok: boolean; required: boolean; detail: string }[];
};

const when = (v: string) =>
  new Date(v).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

export default function DeployHealth() {
  const [rows, setRows] = useState<Row[]>([]);
  const [live, setLive] = useState<LiveHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [pinging, setPinging] = useState(false);

  const load = useCallback(async () => {
    const [{ data }, liveRes] = await Promise.all([
      supabase
        .from("ss_deploy_health_checks")
        .select("*")
        .order("checked_at", { ascending: false })
        .limit(40),
      fetch("/api/public/health", { cache: "no-store" })
        .then((r) => r.json() as Promise<LiveHealth>)
        .catch(() => null),
    ]);
    setRows((data ?? []) as Row[]);
    setLive(liveRes);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const runNow = async () => {
    setPinging(true);
    try {
      const res = await fetch("/api/public/hooks/health-watch?source=manual", { method: "POST" });
      const body = (await res.json()) as { status: string };
      toast[body.status === "ok" ? "success" : "error"](`Health check: ${body.status}`);
      await load();
    } catch {
      toast.error("Could not run the health check");
    } finally {
      setPinging(false);
    }
  };

  const pings: DeployPing[] = useMemo(
    () =>
      rows.map((r) => ({
        checkedAt: r.checked_at,
        status: r.status,
        bootId: r.boot_id,
        failed: r.failed_checks ?? [],
      })),
    [rows],
  );

  const currentFailures = useMemo(
    () => (live?.checks ?? []).filter((c) => !c.ok && c.required).map((c) => c.name),
    [live],
  );

  const checklist = useMemo(
    () => buildRollbackChecklist(pings, currentFailures),
    [pings, currentFailures],
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="crm-h1">Deploy Health</h1>
          <p className="crm-sub">Startup dependency status, health pings and the rollback checklist.</p>
        </div>
        <button type="button" className="crm-btn" onClick={runNow} disabled={pinging}>
          {pinging ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Run check now
        </button>
      </header>

      {/* Live dependency status */}
      <section className="crm-card p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="crm-h2">SSR boot status</h2>
          {live && (
            <Chip tone={live.status === "ok" ? "aqua" : live.status === "degraded" ? "ink" : "burgundy"}>
              {live.status}
            </Chip>
          )}
        </div>
        {!live ? (
          <p className="crm-sub mt-2">Health endpoint unreachable.</p>
        ) : (
          <>
            <p className="crm-sub mt-1">
              Boot {live.bootId ?? "—"} · checked {when(live.checkedAt)}
            </p>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {live.checks.map((c) => (
                <li key={c.name} className="flex items-start gap-2 border border-black/10 p-2 text-sm">
                  {c.ok ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  ) : (
                    <AlertTriangle
                      className={`mt-0.5 h-4 w-4 shrink-0 ${c.required ? "text-red-600" : "text-amber-600"}`}
                    />
                  )}
                  <span className="min-w-0">
                    <span className="font-medium">{c.name}</span>
                    <span className="block text-xs opacity-70">{c.detail}</span>
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      {/* Rollback checklist */}
      <section className={`crm-card p-4 ${checklist.triggered ? "border-red-500" : ""}`}>
        <div className="flex items-center gap-2">
          <RotateCcw className="h-4 w-4" />
          <h2 className="crm-h2">Rollback checklist</h2>
        </div>
        <p className="crm-sub mt-1">{checklist.headline}</p>
        {checklist.triggered ? (
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm">
            {checklist.steps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
        ) : (
          <p className="mt-2 text-sm opacity-70">
            {checklist.lastGood
              ? `Last healthy ping ${when(checklist.lastGood.checkedAt)} (boot ${checklist.lastGood.bootId ?? "—"}).`
              : "No pings recorded yet — run a check to start the history."}
          </p>
        )}
      </section>

      <CanaryPanel />

      {/* History */}
      <section className="crm-card p-4">
        <h2 className="crm-h2">Ping history</h2>
        {loading ? (
          <p className="crm-sub mt-2">Loading…</p>
        ) : !rows.length ? (
          <p className="crm-sub mt-2">No health pings recorded yet.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase opacity-60">
                <tr>
                  <th className="py-2">When</th>
                  <th>Status</th>
                  <th>HTTP</th>
                  <th>Boot</th>
                  <th>Failing</th>
                  <th>Alert</th>
                  <th>Source</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-black/10">
                    <td className="py-2 whitespace-nowrap">{when(r.checked_at)}</td>
                    <td>
                      <Chip tone={r.status === "ok" ? "aqua" : r.status === "degraded" ? "ink" : "burgundy"}>
                        {r.status}
                      </Chip>
                    </td>
                    <td>{r.http_status ?? "—"}</td>
                    <td className="font-mono text-xs">{r.boot_id ?? "—"}</td>
                    <td className="max-w-[220px] truncate">{(r.failed_checks ?? []).join(", ") || "—"}</td>
                    <td className="max-w-[220px] truncate">{r.alert_result ?? "—"}</td>
                    <td>{r.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
