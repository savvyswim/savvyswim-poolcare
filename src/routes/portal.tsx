import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getMyPortal, sendPortalMessage, requestPortalReschedule } from "@/lib/portal.functions";

export const Route = createFileRoute("/portal")({
  head: () => ({
    meta: [
      { title: "Customer Portal | Savvy Swim" },
      { name: "description", content: "Your Savvy Swim booking, confirmations, visits and messages in one place." },
      { property: "og:title", content: "Customer Portal | Savvy Swim" },
      { property: "og:description", content: "Your Savvy Swim booking, visits and messages." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Portal,
});

const fmtDay = (d: string) =>
  new Date(d.length === 10 ? `${d}T12:00:00` : d).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

const EVENT_LABEL: Record<string, string> = {
  email_sent: "Email from us",
  sms_sent: "Text from us",
  booking_confirmation_sent: "Booking confirmation",
  visit_scheduled: "Visit scheduled",
};

function Portal() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setAuthed(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setAuthed(!!s));
    return () => sub.subscription.unsubscribe();
  }, []);
  if (authed === null) return <div className="p-10 text-sm text-foreground/60">Loading...</div>;
  if (!authed) return <SignIn />;
  return <PortalHome />;
}

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
      <h1 className="font-display text-2xl uppercase tracking-[0.08em]">My pool account</h1>
      <p className="mt-2 text-sm text-foreground/60">Sign in with the email we sent your invite to.</p>
      <input className="mt-6 w-full border border-foreground/20 bg-transparent px-3 py-2 text-sm" type="email" autoComplete="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <input className="mt-3 w-full border border-foreground/20 bg-transparent px-3 py-2 text-sm" type="password" autoComplete="current-password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      <button className="mt-5 w-full bg-primary px-4 py-2 text-sm uppercase tracking-[0.12em] text-primary-foreground disabled:opacity-60" disabled={busy} type="submit">
        {busy ? "Checking..." : "Sign in"}
      </button>
      <button
        type="button"
        className="mt-3 w-full text-xs text-foreground/60 underline"
        onClick={async () => {
          if (!email) return toast.error("Type your email first");
          await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password?next=/portal` });
          toast.success("Check your email for a link");
        }}
      >
        Forgot password?
      </button>
    </form>
  );
}

function PortalHome() {
  const fetchPortal = useServerFn(getMyPortal);
  const send = useServerFn(sendPortalMessage);
  const reschedule = useServerFn(requestPortalReschedule);
  const q = useQuery({ queryKey: ["my-portal"], queryFn: () => fetchPortal() });
  const [msg, setMsg] = useState("");
  const [day, setDay] = useState("");
  const [busy, setBusy] = useState(false);
  const d = q.data;
  const today = new Date().toISOString().slice(0, 10);

  if (q.isLoading) return <div className="p-10 text-sm text-foreground/60">Loading your account...</div>;
  if (q.error) return <div className="p-10 text-sm text-destructive">{(q.error as Error).message}</div>;
  if (!d || !d.linked)
    return (
      <main className="mx-auto max-w-xl px-5 py-16 text-sm">
        <h1 className="font-display text-3xl uppercase">Almost there</h1>
        <p className="mt-3 text-foreground/70">Your login is not linked to a pool yet. Call 817-663-7665 and we will connect it.</p>
        <button className="mt-6 underline" onClick={() => supabase.auth.signOut()}>Sign out</button>
      </main>
    );

  const upcoming = d.visits.filter((v) => v.scheduled_date >= today).reverse();
  const past = d.visits.filter((v) => v.scheduled_date < today);

  return (
    <main className="mx-auto max-w-4xl px-5 py-12">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-foreground/15 pb-6">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-primary">Savvy Swim</p>
          <h1 className="font-display text-4xl uppercase">Hi {d.customer?.full_name?.split(" ")[0] ?? "there"}</h1>
          <p className="mt-1 text-sm text-foreground/60">{d.customer?.address}</p>
        </div>
        <button className="text-xs uppercase tracking-[0.12em] underline" onClick={() => supabase.auth.signOut()}>Sign out</button>
      </header>

      <section className="mt-10">
        <h2 className="font-display text-xl uppercase tracking-[0.08em]">My booking</h2>
        {d.requests.length === 0 ? <p className="mt-2 text-sm text-foreground/55">No bookings yet.</p> : (
          <ul className="mt-3 space-y-2">
            {d.requests.map((r) => (
              <li key={r.id} className="border border-foreground/15 p-4 text-sm">
                <div className="font-semibold">Reference {r.reference_number ?? r.id.slice(0, 8)}</div>
                <div className="text-foreground/70">
                  {r.preferred_date ? `Requested ${fmtDay(r.preferred_date)}` : "Flexible day"}
                  {r.preferred_contact_time ? `, ${r.preferred_contact_time}` : ""}
                </div>
                <div className="mt-1 text-xs uppercase tracking-[0.12em] text-primary">
                  {r.status === "scheduled" || r.status === "confirmed" ? "Booked" : r.status === "converted" ? "Visit done" : "Received"}
                </div>
              </li>
            ))}
          </ul>
        )}
        {d.confirmations.length > 0 ? (
          <ul className="mt-4 space-y-1 text-sm text-foreground/70">
            {d.confirmations.map((c, i) => (
              <li key={i}>{fmtDay(c.created_at)}: {EVENT_LABEL[c.event_type] ?? "Update"}</li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="mt-10">
        <h2 className="font-display text-xl uppercase tracking-[0.08em]">My schedule</h2>
        {upcoming.length === 0 ? <p className="mt-2 text-sm text-foreground/55">No upcoming visits.</p> : (
          <ul className="mt-3 space-y-2">
            {upcoming.map((v) => (
              <li key={v.id} className="border border-foreground/15 p-4 text-sm">
                <div className="font-semibold">{fmtDay(v.scheduled_date)}</div>
                {v.notes ? <div className="text-foreground/70">{v.notes.match(/Arrival [^.]*/)?.[0] ?? ""}</div> : null}
              </li>
            ))}
          </ul>
        )}
        <form
          className="mt-4 flex flex-wrap items-center gap-2 text-sm"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!day) return;
            setBusy(true);
            try {
              await reschedule({ data: { date: day } });
              toast.success("Request sent, we will confirm shortly");
              setDay("");
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Could not send");
            } finally {
              setBusy(false);
            }
          }}
        >
          <label htmlFor="newday">Request a different day</label>
          <input id="newday" type="date" min={today} className="border border-foreground/20 bg-transparent px-2 py-1" value={day} onChange={(e) => setDay(e.target.value)} />
          <button disabled={busy || !day} className="border border-primary px-3 py-1 text-xs uppercase tracking-[0.12em] text-primary disabled:opacity-50">Send</button>
        </form>
        {past.length > 0 ? (
          <p className="mt-4 text-xs text-foreground/55">Past visits: {past.slice(0, 6).map((v) => fmtDay(v.scheduled_date)).join(", ")}</p>
        ) : null}
      </section>

      <section className="mt-10">
        <h2 className="font-display text-xl uppercase tracking-[0.08em]">Messages</h2>
        <ul className="mt-3 space-y-2">
          {d.messages.length === 0 ? <li className="text-sm text-foreground/55">Send us a message any time.</li> : d.messages.map((m) => (
            <li key={m.id} className={`border-l-2 pl-3 text-sm ${m.author_kind === "customer" ? "border-[#1FA9BE]" : "border-primary"}`}>
              <span className="text-foreground/50">{m.author_kind === "customer" ? "You" : "Savvy Swim"}, {fmtDay(m.created_at)}</span>
              <p className="whitespace-pre-wrap">{m.body}</p>
            </li>
          ))}
        </ul>
        <form
          className="mt-3 flex gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!msg.trim()) return;
            setBusy(true);
            try {
              await send({ data: { body: msg } });
              setMsg("");
              q.refetch();
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Could not send");
            } finally {
              setBusy(false);
            }
          }}
        >
          <input aria-label="Message the office" className="flex-1 border border-foreground/20 bg-transparent px-3 py-2 text-sm" placeholder="Write a message" value={msg} onChange={(e) => setMsg(e.target.value)} />
          <button disabled={busy} className="bg-primary px-4 py-2 text-xs uppercase tracking-[0.12em] text-primary-foreground disabled:opacity-60">Send</button>
        </form>
      </section>
    </main>
  );
}
