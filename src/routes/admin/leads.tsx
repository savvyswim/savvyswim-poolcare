import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getLeadsReport } from "@/lib/leads-dashboard.functions";
import type { LeadRow, LeadsRange } from "@/lib/leads-dashboard.functions";

export const Route = createFileRoute("/admin/leads")({
  component: LeadsPage,
  head: () => ({
    meta: [
      { title: "Free Inspection Leads · Savvy Swim Admin" },
      {
        name: "description",
        content:
          "Internal Savvy Swim console listing every free inspection request with its source, city, discount code and status.",
      },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Free Inspection Leads · Savvy Swim Admin" },
      {
        property: "og:description",
        content: "Every free inspection request with source, city and discount code.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const RANGES: { key: LeadsRange; label: string }[] = [
  { key: "7d", label: "Last 7 days" },
  { key: "30d", label: "Last 30 days" },
  { key: "90d", label: "Last 90 days" },
  { key: "all", label: "All time" },
];

function when(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function csvEscape(value: string | null): string {
  const v = value ?? "";
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

function downloadCsv(leads: LeadRow[]) {
  const header = [
    "created_at",
    "reference",
    "name",
    "email",
    "phone",
    "city",
    "source",
    "campaign",
    "page",
    "type",
    "status",
    "code",
    "code_status",
  ];
  const body = leads.map((l) =>
    [
      l.created_at,
      l.reference_number,
      l.full_name,
      l.email,
      l.phone,
      l.city,
      l.source ?? l.utm_source,
      l.utm_campaign,
      l.page_path,
      l.lead_type,
      l.status,
      l.promo_code,
      l.promo_status,
    ]
      .map((v) => csvEscape(v as string | null))
      .join(","),
  );
  const blob = new Blob([[header.join(","), ...body].join("\n")], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `savvyswim-free-inspections-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
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

function LeadsPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [range, setRange] = useState<LeadsRange>("30d");
  const [filter, setFilter] = useState("");
  const fetchReport = useServerFn(getLeadsReport);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setAuthed(Boolean(data.session)));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) =>
      setAuthed(Boolean(session)),
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  const query = useQuery({
    queryKey: ["admin-leads", range],
    queryFn: () => fetchReport({ data: { range } }),
    enabled: authed === true,
  });

  const report = query.data;
  const visible = useMemo(() => {
    if (!report) return [];
    const q = filter.trim().toLowerCase();
    if (!q) return report.leads;
    return report.leads.filter((l) =>
      [l.full_name, l.email, l.phone, l.city, l.source, l.utm_campaign, l.promo_code]
        .filter(Boolean)
        .some((v) => (v as string).toLowerCase().includes(q)),
    );
  }, [report, filter]);

  if (authed === null) return <div className="p-10 text-sm text-foreground/60">Loading…</div>;
  if (!authed) return <SignIn onDone={() => setAuthed(true)} />;

  const err = query.error as Error | null;

  return (
    <main className="mx-auto max-w-6xl px-5 py-12">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-foreground/15 pb-6">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-[#8E1F2C]">Savvy Swim · Admin</p>
          <h1 className="font-display text-4xl uppercase tracking-[0.04em]">Free inspections</h1>
          <p className="mt-1 text-sm text-foreground/60">
            Every free inspection request captured on the website, with its source and code.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/admin/lead-sources"
            className="border border-foreground/25 px-4 py-2 text-xs uppercase tracking-[0.14em] hover:text-[#8E1F2C]"
          >
            Sources
          </Link>
          <button
            className="border border-foreground/25 px-4 py-2 text-xs uppercase tracking-[0.14em]"
            onClick={() => visible.length && downloadCsv(visible)}
          >
            Export CSV
          </button>
          <button
            className="border border-foreground/25 px-4 py-2 text-xs uppercase tracking-[0.14em]"
            onClick={() => void query.refetch()}
          >
            Refresh
          </button>
        </div>
      </header>

      <nav className="mt-8 flex flex-wrap items-center gap-2">
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
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter name, city, code…"
          className="ml-auto w-56 border border-foreground/20 bg-transparent px-3 py-2 text-sm"
        />
      </nav>

      {err ? (
        <p className="mt-8 border border-[#8E1F2C]/40 p-5 text-sm text-[#8E1F2C]">{err.message}</p>
      ) : null}

      {query.isLoading ? (
        <p className="mt-8 text-sm text-foreground/55">Loading leads…</p>
      ) : report ? (
        <>
          <section className="mt-8 grid gap-4 sm:grid-cols-4">
            {(
              [
                ["Today", String(report.today)],
                ["This week", String(report.week)],
                ["This month", String(report.month)],
                ["With a code", String(report.withCode)],
              ] as const
            ).map(([label, value]) => (
              <div key={label} className="border border-foreground/15 p-5">
                <p className="text-[11px] uppercase tracking-[0.16em] text-foreground/50">{label}</p>
                <p className="mt-2 font-display text-3xl uppercase">{value}</p>
              </div>
            ))}
          </section>

          <div className="mt-10 overflow-x-auto border border-foreground/15">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b border-foreground/15 text-left text-[11px] uppercase tracking-[0.14em] text-foreground/50">
                  <th className="px-4 py-3">Received</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">City</th>
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {visible.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-foreground/55" colSpan={7}>
                      No free inspection requests in this range yet.
                    </td>
                  </tr>
                ) : (
                  visible.map((l) => (
                    <tr key={l.id} className="border-b border-foreground/10 align-top">
                      <td className="px-4 py-3 whitespace-nowrap text-foreground/70">
                        {when(l.created_at)}
                      </td>
                      <td className="px-4 py-3">{l.full_name ?? ", "}</td>
                      <td className="px-4 py-3 text-foreground/70">
                        <div>{l.email ?? ", "}</div>
                        <div>{l.phone ?? ""}</div>
                      </td>
                      <td className="px-4 py-3">{l.city ?? ", "}</td>
                      <td className="px-4 py-3 text-foreground/70">
                        <div>{l.source ?? l.utm_source ?? "direct"}</div>
                        {l.utm_campaign ? (
                          <div className="text-[11px] text-foreground/50">{l.utm_campaign}</div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        {l.promo_code ? (
                          <span
                            title={l.promo_detail ?? undefined}
                            className={`px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] ${
                              l.promo_status === "valid"
                                ? "bg-[#1FA9BE]/15 text-[#0f6b7a]"
                                : "bg-[#8E1F2C]/12 text-[#8E1F2C]"
                            }`}
                          >
                            {l.promo_code}
                          </span>
                        ) : (
                          <span className="text-foreground/40">, </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-foreground/70">{l.status ?? "new"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </main>
  );
}
