import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { appUrl, portalUrl } from "@/lib/app-links";

export const Route = createFileRoute("/office")({
  component: OfficePage,
  head: () => ({
    meta: [
      { title: "Savvy Swim Office · One sign-in for everything" },
      {
        name: "description",
        content: "Office and technician home for Savvy Swim: bookings, calendar, leads, customers and routes.",
      },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Savvy Swim Office" },
      { property: "og:description", content: "One sign-in for the Savvy Swim office and field team." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type Level = "owner" | "office_manager" | "technician" | "contractor" | null;
type Tile = { label: string; note: string; to?: string; href?: string };

const OFFICE_TILES: Tile[] = [
  { label: "Booking requests", note: "Reply, confirm and track who books", to: "/admin/bookings" },
  { label: "Calendar", note: "Upcoming visits by service area", to: "/admin/calendar" },
  { label: "Leads", note: "Every website request", to: "/admin/leads" },
  { label: "Lead sources", note: "Where requests come from", to: "/admin/lead-sources" },
  { label: "Ad results", note: "Meta and Google ads to bookings", to: "/admin/ads" },
  { label: "Reviews", note: "Customer reviews", to: "/admin/reviews" },
  { label: "Customers and invoices", note: "Full customer records, billing, quotes", href: appUrl("/crm") },
  { label: "Listings", note: "Google and directory details", to: "/admin/listing" },
];

const TECH_TILES: Tile[] = [
  { label: "Today's route", note: "Your visits, checklist and readings", href: appUrl("/crm") },
  { label: "Calendar", note: "Upcoming visits", to: "/admin/calendar" },
];

function SignIn() {
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
      }}
    >
      <h1 className="font-display text-2xl uppercase tracking-[0.08em]">Savvy Swim sign in</h1>
      <p className="mt-2 text-sm text-foreground/60">
        Same email and password as savvyswim.app.
      </p>
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
        className="mt-5 w-full bg-primary px-4 py-2 text-sm uppercase tracking-[0.12em] text-primary-foreground disabled:opacity-60"
        disabled={busy}
        type="submit"
      >
        {busy ? "Checking..." : "Sign in"}
      </button>
      <button
        type="button"
        className="mt-3 text-xs underline"
        onClick={async () => {
          if (!email) { toast.error("Type your email first"); return; }
          const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password`,
          });
          if (error) toast.error(error.message);
          else toast.success("Check your email for a reset link");
        }}
      >
        Forgot password?
      </button>
      <p className="mt-4 text-xs text-foreground/60">
        Pool owner? <a className="underline" href={portalUrl()}>Open your customer account</a>
      </p>
    </form>
  );
}

function TileCard({ t }: { t: Tile }) {
  const inner = (
    <>
      <span className="font-display text-lg uppercase tracking-[0.06em]">{t.label}</span>
      <span className="mt-1 block text-sm text-foreground/60">{t.note}</span>
    </>
  );
  const cls = "block border border-foreground/15 p-5 transition-colors hover:bg-foreground/5";
  return t.to ? (
    <Link to={t.to} className={cls}>{inner}</Link>
  ) : (
    <a href={t.href} className={cls}>{inner}</a>
  );
}

function OfficePage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [email, setEmail] = useState("");
  const [level, setLevel] = useState<Level>(null);
  const [isCustomer, setIsCustomer] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      setAuthed(Boolean(user));
      if (!user) return;
      setEmail(user.email ?? "");
      const [{ data: lvl }, { data: cust }] = await Promise.all([
        supabase.rpc("ss_my_level", { _uid: user.id }),
        supabase.rpc("ss_my_customer_id"),
      ]);
      setLevel((lvl as Level) ?? null);
      setIsCustomer(Boolean(cust));
    };
    void load();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") void load();
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (authed === null) return <div className="p-10 text-sm text-foreground/60">Loading...</div>;
  if (!authed) return <SignIn />;

  const isOffice = level === "owner" || level === "office_manager";
  const isTech = level === "technician" || level === "contractor";
  const tiles = isOffice ? OFFICE_TILES : isTech ? TECH_TILES : [];

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-foreground/60">
            {isOffice ? "Office" : isTech ? "Field team" : "Account"}
          </p>
          <h1 className="font-display text-4xl uppercase tracking-[0.04em]">Savvy Swim</h1>
          <p className="mt-1 text-sm text-foreground/60">Signed in as {email}</p>
        </div>
        <button
          className="border border-foreground/20 px-4 py-2 text-sm uppercase tracking-[0.12em]"
          onClick={async () => {
            await supabase.auth.signOut();
          }}
        >
          Sign out
        </button>
      </div>

      {tiles.length > 0 && (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tiles.map((t) => <TileCard key={t.label} t={t} />)}
        </div>
      )}

      {isCustomer && (
        <div className="mt-8 border border-foreground/15 p-6">
          <h2 className="font-display text-xl uppercase">Your pool</h2>
          <p className="mt-1 text-sm text-foreground/60">
            Next visit, reports, invoices and messages live in your customer account.
          </p>
          <a className="mt-4 inline-block bg-primary px-4 py-2 text-sm uppercase tracking-[0.12em] text-primary-foreground" href={portalUrl()}>
            Open my account
          </a>
        </div>
      )}

      {tiles.length === 0 && !isCustomer && (
        <p className="mt-8 text-sm text-foreground/70">
          This login is not linked to a team member or customer yet. Call 817-663-7665 and we will connect it.
        </p>
      )}
    </main>
  );
}
