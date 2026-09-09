import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getCanaryRouteReport } from "@/lib/canary-status.functions";
import type { CanaryRouteStatus } from "@/lib/canary-status.server";

export const Route = createFileRoute("/admin/canary")({
  component: CanaryAdminPage,
  head: () => ({
    meta: [
      { title: "Canary Routes · Savvy Swim Admin" },
      {
        name: "description",
        content:
          "Internal Savvy Swim admin console listing every monitored route and when each page last passed its uptime check.",
      },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Canary Routes · Savvy Swim Admin" },
      {
        property: "og:description",
        content: "Monitored routes and their last successful check for savvyswim.com.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function when(iso: string | null): string {
  if (!iso) return ", ";
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return ", ";
  return new Date(t).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function ago(iso: string | null): string {
  if (!iso) return "never";
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "never";
  const mins = Math.max(0, Math.round((Date.now() - t) / 60000));
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function SignIn({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <form
      className="mx-auto mt-24 w-full max-w-sm border border-foreground/15 bg-background p-8"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        setBusy(false);
        if (error) toast.error(error.message);
        else onDone();
      }}
    >
      <h1 className="font-display text-2xl uppercase tracking-[0.08em]">Admin sign in</h1>
      <p className="mt-2 text-sm text-foreground/60">Office and owner accounts only.</p>
      <input
        className="mt-6 w-full border border-foreground/20 bg-transparent px-3 py-2 text-sm"
        type="email"
        autoComplete="email"
        placeholder="you@savvyswim.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <input
        className="mt-3 w-full border border-foreground/20 bg-transparent px-3 py-2 text-sm"
        type="password"
        autoComplete="current-password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      <button
        className="mt-5 w-full bg-[#8E1F2C] px-4 py-2 text-sm uppercase tracking-[0.12em] text-[#F4EFE3] disabled:opacity-60"
        disabled={busy}
        type="submit"
      >
        {busy ? "Checking…" : "Sign in"}
      </button>
    </form>
  );
}

function Stat({ label, value, alarm }: { label: string; value: string | number; alarm?: boolean }) {
  return (
    <div className={`border p-5 ${alarm ? "border-[#8E1F2C]/50" : "border-foreground/15"}`}>
      <p className="text-[11px] uppercase tracking-[0.16em] text-foreground/50">{label}</p>
      <p className={`mt-2 font-display text-4xl ${alarm ? "text-[#8E1F2C]" : ""}`}>{value}</p>
    </div>
  );
}

function StatusPill({ row }: { row: CanaryRouteStatus }) {
  const label =
    row.last_status === "failed" ? "failing" : row.last_status === "unknown" ? "not checked yet" : "passing";
  const tone =
    row.last_status === "failed"
      ? "bg-[#8E1F2C]/12 text-[#8E1F2C]"
      : row.last_status === "unknown"
        ? "bg-foreground/8 text-foreground/60"
        : "bg-[#1FA9BE]/12 text-[#0f7183]";
  return (
    <span className={`px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] ${tone}`}>{label}</span>
  );
}

function CanaryAdminPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [filter, setFilter] = useState<"all" | "failing" | "stale">("all");
  const fetchReport = useServerFn(getCanaryRouteReport);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => setAuthed(Boolean(data.session)));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) =>
      setAuthed(Boolean(session)),
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  const query = useQuery({
    queryKey: ["canary-route-report"],
    queryFn: () => fetchReport(),
    enabled: authed === true,
    refetchInterval: 60_000,
  });

  const report = query.data;
  const rows = useMemo(() => {
    const all = report?.routes ?? [];
    if (filter === "failing") return all.filter((r) => r.last_status === "failed");
    if (filter === "stale") return all.filter((r) => r.stale);
    return all;
  }, [report, filter]);

  if (authed === null) return <div className="p-10 text-sm text-foreground/60">Loading…</div>;
  if (!authed) return <SignIn onDone={() => setAuthed(true)} />;

  const err = query.error as Error | null;

  return (
    <main className="mx-auto max-w-6xl px-5 py-12">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-foreground/15 pb-6">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-[#8E1F2C]">Savvy Swim · Admin</p>
          <h1 className="font-display text-4xl uppercase tracking-[0.04em]">Canary routes</h1>
          <p className="mt-1 text-sm text-foreground/60">
            Every page the uptime canary watches on{" "}
            <span className="font-tech">{report?.target ?? "savvyswim.com"}</span>, with the
            last time each one was checked and last passed.
          </p>
        </div>
        <button
          className="border border-foreground/25 px-4 py-2 text-xs uppercase tracking-[0.14em]"
          onClick={() => void query.refetch()}
        >
          Refresh
        </button>
      </header>

      {err ? (
        <p className="mt-6 border border-[#8E1F2C]/40 p-4 text-sm text-[#8E1F2C]">{err.message}</p>
      ) : null}

      <section className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Monitored routes" value={report?.monitoredCount ?? "-"} />
        <Stat
          label="Failing now"
          value={report?.failingCount ?? "-"}
          alarm={(report?.failingCount ?? 0) > 0}
        />
        <Stat
          label="Stale (>6h no pass)"
          value={report?.staleCount ?? "-"}
          alarm={(report?.staleCount ?? 0) > 0}
        />
        <Stat label="Never checked" value={report?.neverCheckedCount ?? "-"} />
      </section>

      <section className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Probes (24h)" value={report?.overall24h.requests ?? "-"} />
        <Stat
          label="Error rate (24h)"
          value={report ? `${(report.overall24h.errorRate * 100).toFixed(2)}%` : "-"}
          alarm={(report?.overall24h.errorRate ?? 0) > 0.01}
        />
        <Stat label="Avg latency (24h)" value={report ? `${report.overall24h.avgMs}ms` : "-"} />
        <Stat
          label="p95 latency (24h)"
          value={report ? `${report.overall24h.p95Ms}ms` : "-"}
          alarm={(report?.overall24h.p95Ms ?? 0) > 3000}
        />
      </section>

      {report?.lastRun ? (
        <p className="mt-4 text-xs uppercase tracking-[0.14em] text-foreground/55">
          Last run · {when(report.lastRun.startedAt)} ({ago(report.lastRun.startedAt)}) ·{" "}
          {report.lastRun.source} · {report.lastRun.requests} probes · {report.lastRun.failures}{" "}
          failures · slowest {report.lastRun.slowestMs}ms · {report.lastRun.status}
        </p>
      ) : (
        <p className="mt-4 text-xs uppercase tracking-[0.14em] text-foreground/55">
          No canary run recorded yet.
        </p>
      )}


      <nav className="mt-8 flex gap-2 border-b border-foreground/15">
        {(
          [
            ["all", `All routes (${report?.routes.length ?? 0})`],
            ["failing", `Failing (${report?.failingCount ?? 0})`],
            ["stale", `Stale (${report?.staleCount ?? 0})`],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={`px-4 py-2 text-xs uppercase tracking-[0.14em] ${
              filter === key ? "border-b-2 border-[#8E1F2C] text-[#8E1F2C]" : "text-foreground/55"
            }`}
          >
            {label}
          </button>
        ))}
      </nav>

      <div className="mt-6 overflow-x-auto">
        {rows.length === 0 ? (
          <p className="py-10 text-sm text-foreground/55">Nothing to show here.</p>
        ) : (
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="text-[11px] uppercase tracking-[0.14em] text-foreground/50">
              <tr className="border-b border-foreground/15">
                <th className="py-2 pr-4">Route</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Last checked</th>
                <th className="py-2 pr-4">Last passed</th>
                <th className="py-2 pr-4">HTTP</th>
                <th className="py-2 pr-4">Time</th>
                <th className="py-2 pr-4">Avg / p95 (24h)</th>
                <th className="py-2 pr-4">Errors (24h)</th>
                <th className="py-2 pr-4">Detail</th>
              </tr>


            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.route} className="border-b border-foreground/10 align-top">
                  <td className="py-2 pr-4 font-tech break-all">
                    {r.route}
                    {r.guarded ? (
                      <span className="ml-2 bg-foreground/8 px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-foreground/60">
                        guarded
                      </span>
                    ) : null}
                    {r.redirect ? (
                      <span className="ml-2 bg-foreground/8 px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-foreground/60">
                        redirect
                      </span>
                    ) : null}
                    {!r.monitored ? (
                      <span className="ml-2 bg-foreground/8 px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-foreground/60">
                        retired
                      </span>
                    ) : null}
                  </td>
                  <td className="py-2 pr-4">
                    <StatusPill row={r} />
                  </td>
                  <td className="py-2 pr-4 whitespace-nowrap text-foreground/70">
                    {when(r.last_checked_at || null)}
                  </td>
                  <td
                    className={`py-2 pr-4 whitespace-nowrap ${r.stale ? "text-[#8E1F2C]" : "text-foreground/70"}`}
                  >
                    {when(r.last_ok_at)}
                    <span className="ml-2 text-xs text-foreground/50">({ago(r.last_ok_at)})</span>
                  </td>
                  <td className="py-2 pr-4 font-tech text-xs">{r.last_http_status ?? "-"}</td>
                  <td className="py-2 pr-4 font-tech text-xs">
                    {r.last_duration_ms != null ? `${r.last_duration_ms}ms` : "-"}
                  </td>
                  <td className="py-2 pr-4 font-tech text-xs whitespace-nowrap">
                    {r.trend24h.requests
                      ? `${r.trend24h.avgMs}ms / ${r.trend24h.p95Ms}ms`
                      : "-"}
                  </td>
                  <td
                    className={`py-2 pr-4 font-tech text-xs whitespace-nowrap ${
                      r.trend24h.failures > 0 ? "text-[#8E1F2C]" : "text-foreground/70"
                    }`}
                  >
                    {r.trend24h.requests
                      ? `${(r.trend24h.errorRate * 100).toFixed(1)}% (${r.trend24h.failures}/${r.trend24h.requests})`
                      : "-"}
                  </td>
                  <td className="py-2 pr-4 text-xs text-foreground/60">

                    {r.last_message ??
                      (r.consecutive_failures > 0 ? `${r.consecutive_failures} in a row` : "-")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}
