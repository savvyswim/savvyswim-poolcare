import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getWebsiteToAppReport, resendWebsiteItem, getSameOnBoth, fixSameOnBoth } from "@/lib/website-to-app.functions";
import type { WebsiteToAppRow } from "@/lib/website-to-app.functions";

export const Route = createFileRoute("/admin/website-to-app")({
  component: WebsiteToAppPage,
  head: () => ({
    meta: [
      { title: "Website to App · Savvy Swim Admin" },
      {
        name: "description",
        content:
          "Internal Savvy Swim console showing every lead, booking, review and call tap the website sent to the SavvySwim app.",
      },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Website to App · Savvy Swim Admin" },
      {
        property: "og:description",
        content: "Delivery status for everything the website sends to the SavvySwim app.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const KIND_LABEL: Record<WebsiteToAppRow["kind"], string> = {
  lead: "Lead or booking",
  review: "Review",
  contact: "Call or text tap",
};

function when(iso: string | null): string {
  if (!iso) return "not yet";
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
        {busy ? "Checking..." : "Sign in"}
      </button>
    </form>
  );
}

function WebsiteToAppPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [onlyFailed, setOnlyFailed] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const fetchReport = useServerFn(getWebsiteToAppReport);
  const resend = useServerFn(resendWebsiteItem);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setAuthed(Boolean(data.session)));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) =>
      setAuthed(Boolean(session)),
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  const query = useQuery({
    queryKey: ["admin-website-to-app"],
    queryFn: () => fetchReport(),
    enabled: authed === true,
  });

  const report = query.data;
  const visible = useMemo(() => {
    if (!report) return [];
    return onlyFailed ? report.rows.filter((r) => r.outcome !== "success") : report.rows;
  }, [report, onlyFailed]);

  if (authed === null) return <div className="p-10 text-sm text-foreground/60">Loading...</div>;
  if (!authed) return <SignIn onDone={() => setAuthed(true)} />;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl uppercase tracking-[0.08em] text-[#8E1F2C]">
            Website to app
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-foreground/70">
            Every lead, booking, review and call tap the website captured, and whether the SavvySwim
            app accepted it. Anything red retries by itself, and you can resend it here.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link className="text-sm underline" to="/admin/bookings">
            Booking requests
          </Link>
          <button
            className="border border-foreground/20 px-3 py-1.5 text-sm"
            onClick={() => query.refetch()}
            type="button"
          >
            Refresh
          </button>
        </div>
      </header>

      {report ? (
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="border border-foreground/15 p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-foreground/55">Sent over</p>
            <p className="mt-1 text-2xl font-black">{report.totals.delivered}</p>
          </div>
          <div className="border border-foreground/15 p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-foreground/55">Needs attention</p>
            <p className="mt-1 text-2xl font-black text-[#8E1F2C]">{report.totals.failed}</p>
          </div>
          <div className="border border-foreground/15 p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-foreground/55">Total tracked</p>
            <p className="mt-1 text-2xl font-black">{report.totals.total}</p>
          </div>
        </div>
      ) : null}

      <SameOnBoth />

      <label className="mt-6 flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={onlyFailed}
          onChange={(e) => setOnlyFailed(e.target.checked)}
        />
        Show only what did not land
      </label>

      <div className="mt-4 overflow-x-auto border border-foreground/15">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="bg-foreground/5 text-xs uppercase tracking-[0.12em] text-foreground/60">
            <tr>
              <th className="px-3 py-2">What</th>
              <th className="px-3 py-2">Details</th>
              <th className="px-3 py-2">Captured</th>
              <th className="px-3 py-2">Last try</th>
              <th className="px-3 py-2">Tries</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {query.isLoading ? (
              <tr>
                <td className="px-3 py-6 text-foreground/60" colSpan={7}>
                  Loading...
                </td>
              </tr>
            ) : visible.length === 0 ? (
              <tr>
                <td className="px-3 py-6 text-foreground/60" colSpan={7}>
                  Nothing to show yet.
                </td>
              </tr>
            ) : (
              visible.map((row) => (
                <tr className="border-t border-foreground/10 align-top" key={row.id}>
                  <td className="px-3 py-2">{KIND_LABEL[row.kind]}</td>
                  <td className="px-3 py-2">
                    <span className="block">{row.reference}</span>
                    {row.last_error ? (
                      <span className="mt-1 block text-xs text-[#8E1F2C]">{row.last_error}</span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">{when(row.created_at)}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{when(row.last_attempt_at)}</td>
                  <td className="px-3 py-2">{row.attempts}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {row.outcome === "success" ? (
                      <span className="text-[#1FA9BE]">Landed in the app</span>
                    ) : (
                      <span className="text-[#8E1F2C]">
                        Did not land{row.http_status ? ` (${row.http_status})` : ""}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {row.outcome === "success" ? null : (
                      <button
                        className="border border-foreground/25 px-2 py-1 text-xs disabled:opacity-50"
                        disabled={busyId === row.id}
                        onClick={async () => {
                          setBusyId(row.id);
                          try {
                            const res = await resend({ data: { id: row.id } });
                            if (res.ok) toast.success("Sent to the app");
                            else toast.error("The app did not accept it, try again shortly");
                            await query.refetch();
                          } catch {
                            toast.error("Could not resend just now");
                          } finally {
                            setBusyId(null);
                          }
                        }}
                        type="button"
                      >
                        {busyId === row.id ? "Sending..." : "Resend"}
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}

function SameOnBoth() {
  const check = useServerFn(getSameOnBoth);
  const fix = useServerFn(fixSameOnBoth);
  const [busy, setBusy] = useState(false);
  const q = useQuery({ queryKey: ["same-on-both"], queryFn: () => check() });
  const missing = q.data?.missing ?? [];
  return (
    <section className="mt-6 border border-foreground/15 p-4">
      <h2 className="text-xs uppercase tracking-[0.16em] text-foreground/55">Same on both</h2>
      {q.isLoading ? (
        <p className="mt-2 text-sm">Checking...</p>
      ) : q.isError ? (
        <p className="mt-2 text-sm">Could not run the check. Try Refresh.</p>
      ) : missing.length === 0 ? (
        <p className="mt-2 text-sm">All {q.data?.total ?? 0} website requests from the last 90 days are in the CRM lead list.</p>
      ) : (
        <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
          <span>{missing.length} of {q.data?.total} website requests are missing from the CRM lead list.</span>
          <button
            type="button"
            disabled={busy}
            className="border border-foreground/20 px-3 py-1.5 disabled:opacity-60"
            onClick={async () => {
              setBusy(true);
              try {
                const r = await fix({ data: { ids: missing.map((m) => m.id) } });
                toast.success(`${r.fixed} added to the CRM`);
                await q.refetch();
              } catch {
                toast.error("Could not add them, try again");
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Adding..." : "Add them to the CRM"}
          </button>
        </div>
      )}
    </section>
  );
}
