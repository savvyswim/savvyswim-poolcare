import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getNotFoundReport } from "@/lib/not-found-log.functions";
import type { NotFoundEventRow } from "@/lib/not-found-log.server";

export const Route = createFileRoute("/admin/not-found")({
  component: NotFoundAdminPage,
  head: () => ({
    meta: [
      { title: "404 Monitor · Savvy Swim Admin" },
      {
        name: "description",
        content:
          "Internal Savvy Swim admin console listing every missing page visitors hit, broken internal links and 404 alerts.",
      },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "404 Monitor · Savvy Swim Admin" },
      {
        property: "og:description",
        content: "Missing pages, broken internal links and 404 alerts for savvyswim.com.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function when(iso: string | null): string {
  if (!iso) return ", ";
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
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

function EventTable({ rows }: { rows: NotFoundEventRow[] }) {
  if (!rows.length) {
    return <p className="py-10 text-sm text-foreground/55">Nothing here. No 404s logged.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="text-[11px] uppercase tracking-[0.14em] text-foreground/50">
          <tr className="border-b border-foreground/15">
            <th className="py-2 pr-4">When</th>
            <th className="py-2 pr-4">Path</th>
            <th className="py-2 pr-4">Referrer</th>
            <th className="py-2 pr-4">Alert</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-foreground/10 align-top">
              <td className="py-2 pr-4 whitespace-nowrap text-foreground/70">
                {when(r.created_at)}
              </td>
              <td className="py-2 pr-4 font-tech break-all">
                {r.path}
                {r.internal_referrer ? (
                  <span className="ml-2 bg-[#8E1F2C]/12 px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-[#8E1F2C]">
                    internal link
                  </span>
                ) : null}
              </td>
              <td className="py-2 pr-4 break-all text-xs text-foreground/60">
                {r.referrer ?? ", "}
              </td>
              <td className="py-2 pr-4 text-xs text-foreground/60">
                {r.alerted ? (r.alert_result ?? "sent") : ", "}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function NotFoundAdminPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [tab, setTab] = useState<"paths" | "recent" | "alerts">("paths");
  const fetchReport = useServerFn(getNotFoundReport);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => setAuthed(Boolean(data.session)));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) =>
      setAuthed(Boolean(session)),
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  const query = useQuery({
    queryKey: ["not-found-report"],
    queryFn: () => fetchReport(),
    enabled: authed === true,
    refetchInterval: 60_000,
  });

  const report = query.data;
  const paths = useMemo(() => report?.paths ?? [], [report]);

  if (authed === null) return <div className="p-10 text-sm text-foreground/60">Loading…</div>;
  if (!authed) return <SignIn onDone={() => setAuthed(true)} />;

  const err = query.error as Error | null;

  return (
    <main className="mx-auto max-w-6xl px-5 py-12">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-foreground/15 pb-6">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-[#8E1F2C]">Savvy Swim · Admin</p>
          <h1 className="font-display text-4xl uppercase tracking-[0.04em]">404 monitor</h1>
          <p className="mt-1 text-sm text-foreground/60">
            Every missing page a visitor hit in the last 7 days. Broken internal links and bursts
            page on-call automatically.
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
        <Stat label="404s · 24h" value={report?.total24h ?? ", "} alarm={(report?.total24h ?? 0) > 0} />
        <Stat label="404s · 7d" value={report?.total7d ?? ", "} />
        <Stat
          label="Broken internal links · 7d"
          value={report?.internal7d ?? ", "}
          alarm={(report?.internal7d ?? 0) > 0}
        />
        <Stat label="Distinct paths · 7d" value={report?.distinctPaths7d ?? ", "} />
      </section>

      <nav className="mt-10 flex gap-2 border-b border-foreground/15">
        {(
          [
            ["paths", `Top paths (${paths.length})`],
            ["recent", `Recent hits (${report?.recent.length ?? 0})`],
            ["alerts", `Alerts (${report?.alerts.length ?? 0})`],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`px-4 py-2 text-xs uppercase tracking-[0.14em] ${
              tab === key ? "border-b-2 border-[#8E1F2C] text-[#8E1F2C]" : "text-foreground/55"
            }`}
          >
            {label}
          </button>
        ))}
      </nav>

      <section className="mt-6">
        {query.isLoading ? (
          <p className="py-10 text-sm text-foreground/55">Loading 404 activity…</p>
        ) : tab === "paths" ? (
          paths.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="text-[11px] uppercase tracking-[0.14em] text-foreground/50">
                  <tr className="border-b border-foreground/15">
                    <th className="py-2 pr-4">Path</th>
                    <th className="py-2 pr-4">24h</th>
                    <th className="py-2 pr-4">7d</th>
                    <th className="py-2 pr-4">From our site</th>
                    <th className="py-2 pr-4">Last seen</th>
                  </tr>
                </thead>
                <tbody>
                  {paths.map((p) => (
                    <tr key={p.path} className="border-b border-foreground/10">
                      <td className="py-2 pr-4 font-tech break-all">{p.path}</td>
                      <td className="py-2 pr-4">{p.hits24h}</td>
                      <td className="py-2 pr-4">{p.hits7d}</td>
                      <td
                        className={`py-2 pr-4 ${p.internalHits ? "font-semibold text-[#8E1F2C]" : "text-foreground/50"}`}
                      >
                        {p.internalHits}
                      </td>
                      <td className="py-2 pr-4 whitespace-nowrap text-foreground/70">
                        {when(p.lastSeen)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="py-10 text-sm text-foreground/55">
              No 404s in the last 7 days. Every link is landing.
            </p>
          )
        ) : (
          <EventTable rows={tab === "recent" ? (report?.recent ?? []) : (report?.alerts ?? [])} />
        )}
      </section>
    </main>
  );
}
