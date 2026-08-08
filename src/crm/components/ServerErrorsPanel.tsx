import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, BellRing, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Chip } from "@/crm/components/Brand";

type ServerError = {
  id: string;
  occurred_at: string;
  fingerprint: string;
  source: string;
  message: string;
  stack: string | null;
  route: string | null;
  method: string | null;
  status_code: number | null;
  alert_sent: boolean;
  alert_result: string | null;
};

const when = (v: string) =>
  new Date(v).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

/**
 * Production error monitor. Every SSR / server-route crash recorded by
 * reportServerError shows up here, newest first, with alert delivery status.
 */
export function ServerErrorsPanel() {
  const [rows, setRows] = useState<ServerError[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("ss_server_errors")
      .select("*")
      .order("occurred_at", { ascending: false })
      .limit(50);
    setRows((data ?? []) as ServerError[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const stats = useMemo(() => {
    const now = Date.now();
    const day = rows.filter((r) => now - new Date(r.occurred_at).getTime() < 86_400_000);
    const week = rows.filter((r) => now - new Date(r.occurred_at).getTime() < 7 * 86_400_000);
    return {
      total: rows.length,
      day: day.length,
      week: week.length,
      distinct: new Set(rows.map((r) => r.fingerprint)).size,
      alerted: rows.filter((r) => r.alert_sent).length,
    };
  }, [rows]);

  return (
    <section className={`crm-card p-4 ${stats.day ? "border-red-500" : ""}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          <h2 className="crm-h2">Server errors</h2>
        </div>
        <button type="button" className="crm-btn" onClick={() => void load()}>
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>
      <p className="crm-sub mt-1">
        Every SSR crash is logged here and alerts on-call by email and text the first time it
        appears (once per 15 minutes per distinct error).
      </p>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {[
          ["Last 24h", stats.day],
          ["Last 7d", stats.week],
          ["Distinct", stats.distinct],
          ["Alerted", stats.alerted],
          ["Logged", stats.total],
        ].map(([label, value]) => (
          <div key={String(label)} className="border border-black/10 p-2">
            <div className="text-xs uppercase opacity-60">{label}</div>
            <div className="text-lg font-semibold">{value}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <p className="crm-sub mt-3">Loading…</p>
      ) : !rows.length ? (
        <p className="crm-sub mt-3">No server errors recorded. 🎉</p>
      ) : (
        <div className="mt-3 space-y-2">
          {rows.map((r) => (
            <div key={r.id} className="border border-black/10 p-2 text-sm">
              <button
                type="button"
                className="flex w-full flex-wrap items-center gap-2 text-left"
                onClick={() => setOpen(open === r.id ? null : r.id)}
              >
                <Chip tone="burgundy">{r.source}</Chip>
                <span className="font-mono text-xs">{r.route ?? "—"}</span>
                <span className="min-w-0 flex-1 truncate">{r.message}</span>
                {r.alert_sent && <BellRing className="h-3.5 w-3.5 shrink-0 opacity-70" />}
                <span className="text-xs whitespace-nowrap opacity-60">{when(r.occurred_at)}</span>
              </button>
              {open === r.id && (
                <div className="mt-2 space-y-2">
                  <div className="text-xs opacity-70">
                    {r.method ?? "—"} · HTTP {r.status_code ?? "—"} · alert:{" "}
                    {r.alert_result ?? "not sent"}
                  </div>
                  <pre className="max-h-64 overflow-auto bg-black/5 p-2 text-[11px] whitespace-pre-wrap">
                    {r.stack ?? r.message}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default ServerErrorsPanel;
