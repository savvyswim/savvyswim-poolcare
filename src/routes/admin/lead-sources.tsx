import { Fragment, useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getLeadSources } from "@/lib/lead-sources.functions";
import type { LeadSourceBucket, LeadSourceLead, RangeKey } from "@/lib/lead-sources.functions";

export const Route = createFileRoute("/admin/lead-sources")({
  component: LeadSourcesPage,
  head: () => ({
    meta: [
      { title: "Lead Sources by City · Savvy Swim Admin" },
      {
        name: "description",
        content:
          "Internal Savvy Swim console showing which page every booking and water test came from — home, Frisco, Plano and each city landing page.",
      },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Lead Sources by City · Savvy Swim Admin" },
      {
        property: "og:description",
        content: "City-by-city breakdown of website bookings and water test requests.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const RANGES: { key: RangeKey; label: string }[] = [
  { key: "7d", label: "Last 7 days" },
  { key: "30d", label: "Last 30 days" },
  { key: "90d", label: "Last 90 days" },
  { key: "all", label: "All time" },
];

function when(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
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

function Bar({ share }: { share: number }) {
  return (
    <div className="h-1.5 w-full bg-foreground/10">
      <div className="h-full bg-[#8E1F2C]" style={{ width: `${Math.max(share, 1)}%` }} />
    </div>
  );
}

const CRM_SYNC_TONE: Record<LeadSourceLead["crm_sync"], string> = {
  synced: "bg-[#1FA9BE]/15 text-[#0f6b7a]",
  failed: "bg-[#8E1F2C]/12 text-[#8E1F2C]",
  pending: "bg-foreground/8 text-foreground/55",
};

function CrmSyncBadge({ state }: { state: LeadSourceLead["crm_sync"] }) {
  return (
    <span
      title={
        state === "synced"
          ? "Delivered to the CRM"
          : state === "failed"
            ? "CRM handoff failed — retry on the Lead CRM sync page"
            : "Not yet delivered to the CRM"
      }
      className={`px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] ${CRM_SYNC_TONE[state]}`}
    >
      CRM: {state}
    </span>
  );
}



function BucketTable({
  title,
  note,
  buckets,
  label,
}: {
  title: string;
  note: string;
  buckets: LeadSourceBucket[];
  label: string;
}) {
  const [open, setOpen] = useState<string | null>(null);

  return (
    <section className="mt-12">
      <h2 className="font-display text-2xl uppercase tracking-[0.06em]">{title}</h2>
      <p className="mt-1 text-sm text-foreground/60">{note}</p>

      {buckets.length === 0 ? (
        <p className="mt-6 border border-foreground/15 p-6 text-sm text-foreground/55">
          No leads in this range yet.
        </p>
      ) : (
        <div className="mt-5 overflow-x-auto border border-foreground/15">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-foreground/15 text-left text-[11px] uppercase tracking-[0.14em] text-foreground/50">
                <th className="px-4 py-3">{label}</th>
                <th className="px-4 py-3">Leads</th>
                <th className="px-4 py-3">Bookings</th>
                <th className="px-4 py-3">Water tests</th>
                <th className="px-4 py-3">Share</th>
                <th className="px-4 py-3">First</th>
                <th className="px-4 py-3">Latest</th>
              </tr>
            </thead>
            <tbody>
              {buckets.map((b) => (
                <Fragment key={b.key}>
                  <tr
                    className="cursor-pointer border-b border-foreground/10 hover:bg-foreground/[0.03]"
                    onClick={() => setOpen(open === b.key ? null : b.key)}
                  >
                    <td className="px-4 py-3 font-semibold">{b.key}</td>
                    <td className="px-4 py-3 font-display text-lg">{b.total}</td>
                    <td className="px-4 py-3">{b.booking}</td>
                    <td className="px-4 py-3">{b.waterTest}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="w-12 tabular-nums">{b.share}%</span>
                        <span className="w-24">
                          <Bar share={b.share} />
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-foreground/60">{when(b.first)}</td>
                    <td className="px-4 py-3 text-foreground/60">{when(b.last)}</td>
                  </tr>
                  {open === b.key ? (
                    <tr className="border-b border-foreground/10 bg-foreground/[0.02]">
                      <td colSpan={7} className="px-4 py-4">
                        <ul className="space-y-2">
                          {b.leads.map((l) => (
                            <li
                              key={l.id}
                              className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px]"
                            >
                              <span className="font-semibold">{l.full_name || "—"}</span>
                              <span className="text-foreground/70">{l.phone || "no phone"}</span>
                              <span className="text-foreground/50">{l.email || ""}</span>
                              <span className="text-foreground/50">{l.page_path}</span>
                              <span className="text-foreground/50">{l.source || "—"}</span>
                              <span className="text-foreground/50">{when(l.created_at)}</span>
                              <span className="bg-foreground/8 px-2 py-0.5 text-[11px] uppercase tracking-[0.12em] text-foreground/60">
                                {l.status || "new"}
                              </span>
                              <CrmSyncBadge state={l.crm_sync} />
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
      )}
    </section>
  );
}

function LeadSourcesPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [range, setRange] = useState<RangeKey>("30d");
  const fetchReport = useServerFn(getLeadSources);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setAuthed(Boolean(data.session)));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) =>
      setAuthed(Boolean(session)),
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  const query = useQuery({
    queryKey: ["lead-sources", range],
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
          <h1 className="font-display text-4xl uppercase tracking-[0.04em]">Lead sources</h1>
          <p className="mt-1 text-sm text-foreground/60">
            Where every booking and water test came from — home, Frisco, Plano and each city page.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/admin/lead-sync"
            className="border border-foreground/25 px-4 py-2 text-xs uppercase tracking-[0.14em] hover:text-[#8E1F2C]"
          >
            CRM sync
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
        <p className="mt-8 text-sm text-foreground/55">Loading leads…</p>
      ) : report ? (
        <>
          <section className="mt-8 grid gap-4 sm:grid-cols-3">
            {(
              [
                ["Leads in range", String(report.total)],
                ["Last 7 days", String(report.thisWeek)],
                ["Top city", report.topCity ?? "—"],
              ] as const
            ).map(([label, value]) => (
              <div key={label} className="border border-foreground/15 p-5">
                <p className="text-[11px] uppercase tracking-[0.16em] text-foreground/50">{label}</p>
                <p className="mt-2 font-display text-3xl uppercase">{value}</p>
              </div>
            ))}
          </section>

          <BucketTable
            title="By city"
            note="Grouped from the page each lead was submitted on, so history stays correct."
            buckets={report.byCity}
            label="City"
          />
          <BucketTable
            title="By page"
            note="Exact URL — useful when a city has more than one live landing page."
            buckets={report.byPage}
            label="Page"
          />
          <BucketTable
            title="By button"
            note="Which call to action produced the lead (hero, final CTA, plan card, water test tab)."
            buckets={report.byCta}
            label="CTA"
          />
          <BucketTable
            title="By channel"
            note="Search, social, referral or direct — plus any UTM campaign tag."
            buckets={report.byChannel}
            label="Channel"
          />
        </>
      ) : null}
    </main>
  );
}
