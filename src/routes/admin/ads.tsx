import { Fragment, useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getAdsPerformance } from "@/lib/ads-performance.functions";
import type { AdsRange, AdsChannelRow } from "@/lib/ads-performance.functions";

export const Route = createFileRoute("/admin/ads")({
  component: AdsPage,
  head: () => ({
    meta: [
      { title: "Ad Performance · Savvy Swim Admin" },
      {
        name: "description",
        content:
          "Internal Savvy Swim console showing visits from Meta and other ad campaigns, the free inspection leads they produced and how many got scheduled.",
      },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Ad Performance · Savvy Swim Admin" },
      {
        property: "og:description",
        content: "Visits, leads and booked jobs for every paid campaign.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const RANGES: { key: AdsRange; label: string }[] = [
  { key: "7d", label: "Last 7 days" },
  { key: "30d", label: "Last 30 days" },
  { key: "90d", label: "Last 90 days" },
  { key: "all", label: "All time" },
];

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

function ChannelTable({ rows }: { rows: AdsChannelRow[] }) {
  const [open, setOpen] = useState<string | null>(null);

  if (rows.length === 0) {
    return (
      <p className="mt-6 border border-foreground/15 p-6 text-sm text-foreground/55">
        Nothing recorded in this range yet.
      </p>
    );
  }

  return (
    <div className="mt-5 overflow-x-auto border border-foreground/15">
      <table className="w-full min-w-[720px] text-sm">
        <thead>
          <tr className="border-b border-foreground/15 text-left text-[11px] uppercase tracking-[0.14em] text-foreground/50">
            <th className="px-4 py-3">Where they came from</th>
            <th className="px-4 py-3">Visits</th>
            <th className="px-4 py-3">Leads</th>
            <th className="px-4 py-3">Visit to lead</th>
            <th className="px-4 py-3">Scheduled</th>
            <th className="px-4 py-3">Lead to job</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <Fragment key={r.key}>
              <tr
                className="cursor-pointer border-b border-foreground/10 hover:bg-foreground/[0.03]"
                onClick={() => setOpen(open === r.key ? null : r.key)}
              >
                <td className="px-4 py-3 font-semibold">{r.key}</td>
                <td className="px-4 py-3 font-display text-lg">{r.visits}</td>
                <td className="px-4 py-3 font-display text-lg">{r.leads}</td>
                <td className="px-4 py-3 tabular-nums">{r.visits ? `${r.leadRate}%` : "-"}</td>
                <td className="px-4 py-3">{r.booked}</td>
                <td className="px-4 py-3 tabular-nums">{r.leads ? `${r.bookRate}%` : "-"}</td>
              </tr>
              {open === r.key ? (
                <tr className="border-b border-foreground/10 bg-foreground/[0.02]">
                  <td colSpan={6} className="px-4 py-4">
                    <ul className="space-y-3 text-[13px]">
                      {r.campaigns.map((c) => (
                        <li key={c.key}>
                          <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
                            <span className="font-semibold">{c.key}</span>
                            <span className="text-foreground/60">{c.visits} visits</span>
                            <span className="text-foreground/60">{c.leads} leads</span>
                            <span className="text-foreground/60">{c.booked} scheduled</span>
                            <span className="text-foreground/50">
                              {c.visits ? `${c.leadRate}% visit to lead` : ""}
                            </span>
                          </div>
                          <ul className="mt-1 ml-4 space-y-1 border-l border-foreground/15 pl-4 text-[12px] text-foreground/60">
                            {c.adGroups.map((g) => (
                              <li key={g.key} className="flex flex-wrap items-center gap-x-4">
                                <span className="font-medium text-foreground/80">{g.key}</span>
                                <span>{g.visits} visits</span>
                                <span>{g.leads} leads</span>
                                <span>{g.booked} scheduled</span>
                                <span className="text-foreground/45">
                                  {g.leads ? `${g.bookRate}% lead to job` : ""}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </li>
                      ))}
                    </ul>
                  </td>
                </tr>
              ) : null}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AdsPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [range, setRange] = useState<AdsRange>("30d");
  const fetchReport = useServerFn(getAdsPerformance);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setAuthed(Boolean(data.session)));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) =>
      setAuthed(Boolean(session)),
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  const query = useQuery({
    queryKey: ["ads-performance", range],
    queryFn: () => fetchReport({ data: { range } }),
    enabled: authed === true,
  });

  if (authed === null) return <div className="p-10 text-sm text-foreground/60">Loading…</div>;
  if (!authed) return <SignIn onDone={() => setAuthed(true)} />;

  const err = query.error as Error | null;
  const report = query.data;

  return (
    <main className="mx-auto max-w-6xl px-5 py-12">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-foreground/15 pb-6">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-[#8E1F2C]">Savvy Swim · Admin</p>
          <h1 className="font-display text-4xl uppercase tracking-[0.04em]">Ad performance</h1>
          <p className="mt-1 text-sm text-foreground/60">
            Visits from Facebook and Instagram ads, the free inspection requests they produced, and
            how many of those got on the schedule.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/admin/lead-sources"
            className="border border-foreground/25 px-4 py-2 text-xs uppercase tracking-[0.14em] hover:text-[#8E1F2C]"
          >
            Lead sources
          </Link>
          <button
            className="border border-foreground/25 px-4 py-2 text-xs uppercase tracking-[0.14em]"
            onClick={() => void query.refetch()}
          >
            Refresh
          </button>
        </div>
      </header>

      <nav className="mt-8 flex flex-wrap gap-2">
        {RANGES.map((r) => (
          <button
            key={r.key}
            onClick={() => setRange(r.key)}
            className={`px-4 py-2 text-xs uppercase tracking-[0.14em] ${
              range === r.key
                ? "bg-[#8E1F2C] text-[#F4EFE3]"
                : "border border-foreground/20 text-foreground/70"
            }`}
          >
            {r.label}
          </button>
        ))}
      </nav>

      {err ? (
        <p className="mt-8 border border-[#8E1F2C]/40 p-5 text-sm text-[#8E1F2C]">{err.message}</p>
      ) : null}

      {query.isLoading ? (
        <p className="mt-8 text-sm text-foreground/55">Loading numbers…</p>
      ) : report ? (
        <>
          <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {(
              [
                ["Visits from Meta ads", String(report.meta.visits)],
                ["Leads from Meta ads", String(report.meta.leads)],
                [
                  "Meta visit to lead",
                  report.meta.visits ? `${report.meta.leadRate}%` : "No visits yet",
                ],
                [
                  "Meta lead to job",
                  report.meta.leads ? `${report.meta.bookRate}%` : "No leads yet",
                ],
              ] as const
            ).map(([label, value]) => (
              <div key={label} className="border border-foreground/15 p-5">
                <p className="text-[11px] uppercase tracking-[0.16em] text-foreground/50">{label}</p>
                <p className="mt-2 font-display text-3xl uppercase">{value}</p>
              </div>
            ))}
          </section>

          {report.noVisitData ? (
            <p className="mt-6 border border-foreground/15 bg-foreground/[0.03] p-5 text-sm text-foreground/65">
              No visits recorded yet in this range. Visit counting starts once this update is
              published, and ad clicks only count when the ad link carries campaign tags, for
              example utm_source=facebook&utm_medium=cpc&utm_campaign=spring-pools.
            </p>
          ) : null}

          <section className="mt-12">
            <h2 className="font-display text-2xl uppercase tracking-[0.06em]">Every source</h2>
            <p className="mt-1 text-sm text-foreground/60">
              Tap a row to see the individual campaigns behind it. Totals in range:{" "}
              {report.totalVisits} visits, {report.totalLeads} leads, {report.totalBooked}{" "}
              scheduled.
            </p>
            <ChannelTable rows={report.channels} />
          </section>
        </>
      ) : null}
    </main>
  );
}
