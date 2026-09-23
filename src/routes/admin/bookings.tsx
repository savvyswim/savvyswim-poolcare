import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getBookingsReport, setBookingStatus } from "@/lib/bookings-dashboard.functions";
import type { BookingRow, BookingsRange } from "@/lib/bookings-dashboard.functions";

export const Route = createFileRoute("/admin/bookings")({
  component: BookingsPage,
  head: () => ({
    meta: [
      { title: "Booking Requests · Savvy Swim Admin" },
      {
        name: "description",
        content:
          "Internal Savvy Swim console listing every booking request with name, phone, requested date and service area for follow up.",
      },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Booking Requests · Savvy Swim Admin" },
      {
        property: "og:description",
        content: "Every booking request with name, phone, requested date and service area.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const RANGES: { key: BookingsRange; label: string }[] = [
  { key: "7d", label: "Last 7 days" },
  { key: "30d", label: "Last 30 days" },
  { key: "90d", label: "Last 90 days" },
  { key: "all", label: "All time" },
];

const STATUSES = ["new", "contacted", "scheduled", "closed"] as const;

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

function downloadCsv(rows: BookingRow[]) {
  const header = [
    "received",
    "reference",
    "name",
    "phone",
    "email",
    "requested_date",
    "best_time",
    "service_area",
    "address",
    "source",
    "status",
  ];
  const body = rows.map((b) =>
    [
      b.created_at,
      b.reference_number,
      b.full_name,
      b.phone,
      b.email,
      b.preferred_date,
      b.preferred_contact_time,
      b.city,
      b.address,
      b.source,
      b.status ?? "new",
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
  a.download = `savvyswim-bookings-${new Date().toISOString().slice(0, 10)}.csv`;
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

function BookingsPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [range, setRange] = useState<BookingsRange>("30d");
  const [filter, setFilter] = useState("");
  const [onlyOpen, setOnlyOpen] = useState(false);
  const fetchReport = useServerFn(getBookingsReport);
  const updateStatus = useServerFn(setBookingStatus);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setAuthed(Boolean(data.session)));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) =>
      setAuthed(Boolean(session)),
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  const query = useQuery({
    queryKey: ["admin-bookings", range],
    queryFn: () => fetchReport({ data: { range } }),
    enabled: authed === true,
  });

  const report = query.data;
  const visible = useMemo(() => {
    if (!report) return [];
    const q = filter.trim().toLowerCase();
    return report.bookings.filter((b) => {
      if (onlyOpen && b.status && b.status !== "new") return false;
      if (!q) return true;
      return [b.full_name, b.phone, b.email, b.city, b.address, b.reference_number]
        .filter(Boolean)
        .some((v) => (v as string).toLowerCase().includes(q));
    });
  }, [report, filter, onlyOpen]);

  if (authed === null) return <div className="p-10 text-sm text-foreground/60">Loading…</div>;
  if (!authed) return <SignIn onDone={() => setAuthed(true)} />;

  const err = query.error as Error | null;

  const changeStatus = async (id: string, status: (typeof STATUSES)[number]) => {
    try {
      await updateStatus({ data: { id, status } });
      toast.success(`Marked as ${status}`);
      void query.refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update this booking");
    }
  };

  return (
    <main className="mx-auto max-w-6xl px-5 py-12">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-foreground/15 pb-6">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-[#8E1F2C]">Savvy Swim · Admin</p>
          <h1 className="font-display text-4xl uppercase tracking-[0.04em]">Booking requests</h1>
          <p className="mt-1 text-sm text-foreground/60">
            Everyone who asked for a visit, with the phone number, the date they want and the
            service area, so you can call them back.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/admin/leads"
            className="border border-foreground/25 px-4 py-2 text-xs uppercase tracking-[0.14em] hover:text-[#8E1F2C]"
          >
            All leads
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
        <button
          onClick={() => setOnlyOpen((v) => !v)}
          className={`px-4 py-2 text-xs uppercase tracking-[0.14em] ${
            onlyOpen
              ? "bg-[#1FA9BE] text-[#08323a]"
              : "border border-foreground/20 text-foreground/70"
          }`}
        >
          Needs follow up
        </button>
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Search name, phone, city…"
          className="ml-auto w-56 border border-foreground/20 bg-transparent px-3 py-2 text-sm"
        />
      </nav>

      {err ? (
        <p className="mt-8 border border-[#8E1F2C]/40 p-5 text-sm text-[#8E1F2C]">{err.message}</p>
      ) : null}

      {query.isLoading ? (
        <p className="mt-8 text-sm text-foreground/55">Loading booking requests…</p>
      ) : report ? (
        <>
          <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {(
              [
                ["In this range", String(report.total)],
                ["Needs follow up", String(report.needFollowUp)],
                ["Today", String(report.today)],
                ["This week", String(report.week)],
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
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Requested date</th>
                  <th className="px-4 py-3">Service area</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {visible.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-foreground/55" colSpan={6}>
                      No booking requests in this range yet.
                    </td>
                  </tr>
                ) : (
                  visible.map((b) => (
                    <tr key={b.id} className="border-b border-foreground/10 align-top">
                      <td className="px-4 py-3 whitespace-nowrap text-foreground/70">
                        {when(b.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold">{b.full_name ?? "-"}</div>
                        {b.reference_number ? (
                          <div className="text-[11px] text-foreground/50">{b.reference_number}</div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        {b.phone ? (
                          <a href={`tel:${b.phone.replace(/[^\d+]/g, "")}`} className="text-[#8E1F2C]">
                            {b.phone}
                          </a>
                        ) : (
                          "-"
                        )}
                        {b.email ? (
                          <div className="text-[11px] text-foreground/50">{b.email}</div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-foreground/70">
                        <div>{b.preferred_date ?? "Not given"}</div>
                        {b.preferred_contact_time ? (
                          <div className="text-[11px] text-foreground/50">
                            {b.preferred_contact_time}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        <div>{b.city ?? "-"}</div>
                        {b.address ? (
                          <div className="text-[11px] text-foreground/50">{b.address}</div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={b.status ?? "new"}
                          onChange={(e) =>
                            void changeStatus(b.id, e.target.value as (typeof STATUSES)[number])
                          }
                          className="border border-foreground/20 bg-transparent px-2 py-1 text-xs"
                        >
                          {STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                          {b.status && !STATUSES.includes(b.status as (typeof STATUSES)[number]) ? (
                            <option value={b.status}>{b.status}</option>
                          ) : null}
                        </select>
                      </td>
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
