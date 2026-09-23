import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  getBookingDetail,
  scheduleBookingVisit,
  sendBookingReply,
} from "@/lib/booking-followup.functions";
import { setBookingStatus } from "@/lib/bookings-dashboard.functions";

export const Route = createFileRoute("/admin/bookings/$id")({
  component: BookingFollowUpPage,
  head: () => ({
    meta: [
      { title: "Booking Follow Up · Savvy Swim Admin" },
      {
        name: "description",
        content:
          "Internal Savvy Swim console for replying to one booking request and putting the pool visit on the route.",
      },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Booking Follow Up · Savvy Swim Admin" },
      {
        property: "og:description",
        content: "Reply to a booking request and schedule the pool visit.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const STATUSES = ["new", "contacted", "scheduled", "closed"] as const;

const TEMPLATES: { label: string; body: string }[] = [
  {
    label: "Confirmed for your date",
    body: "Good news, we have your free pool inspection confirmed for the day you picked. Our tech will call or text when they are on the way, and you do not need to be home as long as we can reach the gate.",
  },
  {
    label: "Two windows to choose from",
    body: "Thanks for the request. We can come out in the morning window (8:00 AM to 11:00 AM) or the afternoon window (1:00 PM to 4:00 PM). Reply with the one that suits you and we will lock it in.",
  },
  {
    label: "Need a little more info",
    body: "Before we head out, could you tell us the pool size and whether the equipment is currently running? A quick photo of the pump and filter helps us come prepared with the right parts.",
  },
];

function when(iso: string): string {
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
        {busy ? "Checking" : "Sign in"}
      </button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-foreground/10 py-2">
      <p className="text-[11px] uppercase tracking-[0.16em] text-foreground/50">{label}</p>
      <div className="mt-1 text-sm text-foreground/90">{children}</div>
    </div>
  );
}

function BookingFollowUpPage() {
  const { id } = Route.useParams();
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [message, setMessage] = useState("");
  const [alsoText, setAlsoText] = useState(false);
  const [sending, setSending] = useState(false);
  const [visitDate, setVisitDate] = useState("");
  const [visitWindow, setVisitWindow] = useState("8:00 AM to 11:00 AM");
  const [visitNote, setVisitNote] = useState("");
  const [scheduling, setScheduling] = useState(false);

  const fetchDetail = useServerFn(getBookingDetail);
  const reply = useServerFn(sendBookingReply);
  const schedule = useServerFn(scheduleBookingVisit);
  const updateStatus = useServerFn(setBookingStatus);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setAuthed(Boolean(data.session)));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) =>
      setAuthed(Boolean(session)),
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  const query = useQuery({
    queryKey: ["admin-booking", id],
    queryFn: () => fetchDetail({ data: { id } }),
    enabled: authed === true,
  });

  useEffect(() => {
    const d = query.data?.booking.preferred_date;
    if (d && !visitDate) setVisitDate(d);
  }, [query.data, visitDate]);

  if (authed === null) return <div className="p-10 text-sm text-foreground/60">Loading</div>;
  if (!authed) return <SignIn onDone={() => setAuthed(true)} />;

  const err = query.error as Error | null;
  const data = query.data;
  const b = data?.booking;

  const onReply = async () => {
    if (message.trim().length < 5) {
      toast.error("Write a message first");
      return;
    }
    setSending(true);
    try {
      const res = await reply({ data: { id, message, alsoText, markContacted: true } });
      if (res.email === "sent") toast.success("Reply sent");
      else toast.error("The email did not go out, try again");
      if (res.sms === "sent") toast.success("Text sent too");
      setMessage("");
      void query.refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not send the reply");
    } finally {
      setSending(false);
    }
  };

  const onSchedule = async () => {
    if (!visitDate) {
      toast.error("Pick a visit date");
      return;
    }
    setScheduling(true);
    try {
      await schedule({ data: { id, date: visitDate, window: visitWindow, note: visitNote } });
      toast.success("Visit scheduled");
      setVisitNote("");
      void query.refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not schedule the visit");
    } finally {
      setScheduling(false);
    }
  };

  const changeStatus = async (status: (typeof STATUSES)[number]) => {
    try {
      await updateStatus({ data: { id, status } });
      toast.success(`Marked as ${status}`);
      void query.refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update this booking");
    }
  };

  return (
    <main className="mx-auto max-w-5xl px-5 py-12">
      <header className="border-b border-foreground/15 pb-6">
        <p className="text-[11px] uppercase tracking-[0.2em] text-[#8E1F2C]">Savvy Swim · Admin</p>
        <h1 className="font-display text-4xl uppercase tracking-[0.04em]">Booking follow up</h1>
        <Link to="/admin/bookings" className="mt-2 inline-block text-sm text-foreground/60 underline">
          Back to all booking requests
        </Link>
      </header>

      {query.isLoading && <p className="mt-8 text-sm text-foreground/60">Loading the request</p>}
      {err && <p className="mt-8 text-sm text-[#8E1F2C]">{err.message}</p>}

      {b && data && (
        <div className="mt-8 grid gap-8 lg:grid-cols-[1.05fr_1fr]">
          <section>
            <h2 className="font-display text-xl uppercase tracking-[0.08em]">The request</h2>
            <div className="mt-3">
              <Field label="Name">{b.full_name ?? "Not given"}</Field>
              <Field label="Phone">
                {b.phone ? (
                  <a href={`tel:${b.phone}`} className="text-[#8E1F2C] underline">
                    {b.phone}
                  </a>
                ) : (
                  "Not given"
                )}
              </Field>
              <Field label="Email">{b.email ?? "Not given"}</Field>
              <Field label="Pool address">
                {[b.address, b.postal_code].filter(Boolean).join(", ") || "Not given"}
              </Field>
              <Field label="Requested date">{b.preferred_date ?? "Not given"}</Field>
              <Field label="Best time">{b.preferred_contact_time ?? "Not given"}</Field>
              <Field label="Service asked for">{b.pool_details ?? "Not given"}</Field>
              <Field label="What they wrote">{b.notes ?? "Nothing"}</Field>
              <Field label="Reference">{b.reference_number ?? "Not given"}</Field>
              <Field label="Came in">{when(b.created_at)}</Field>
              <Field label="Where from">
                {[b.source, b.page_path].filter(Boolean).join(" · ") || "Direct"}
              </Field>
              <Field label="Campaign tags">
                {[b.utm_source, b.utm_medium, b.utm_campaign, b.utm_content]
                  .filter(Boolean)
                  .join(" · ") || "None"}
              </Field>
              <Field label="Text consent">{b.sms_opt_in ? "Yes" : "No"}</Field>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              {STATUSES.map((s) => (
                <button
                  key={s}
                  onClick={() => void changeStatus(s)}
                  className={`border px-3 py-1.5 text-xs uppercase tracking-[0.12em] ${
                    (b.status ?? "new") === s
                      ? "border-[#8E1F2C] bg-[#8E1F2C] text-[#F4EFE3]"
                      : "border-foreground/20 text-foreground/70"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>

            <h2 className="mt-10 font-display text-xl uppercase tracking-[0.08em]">History</h2>
            <ul className="mt-3 space-y-3">
              <li className="border-l-2 border-[#1FA9BE] pl-3 text-sm">
                <span className="text-foreground/50">{when(b.created_at)}</span>
                <br />
                Request came in from the website
              </li>
              {b.crm_synced_at && (
                <li className="border-l-2 border-[#1FA9BE] pl-3 text-sm">
                  <span className="text-foreground/50">{when(b.crm_synced_at)}</span>
                  <br />
                  Received by the SavvySwim app
                </li>
              )}
              {data.events.map((e) => (
                <li key={e.id} className="border-l-2 border-foreground/20 pl-3 text-sm">
                  <span className="text-foreground/50">{when(e.created_at)}</span>
                  <br />
                  {e.event_type.replace(/_/g, " ")}
                  {e.recipient ? ` to ${e.recipient}` : ""}
                  {e.status_to ? `: ${e.status_to}` : ""}
                  {e.detail ? (
                    <span className="block text-foreground/60">{e.detail}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl uppercase tracking-[0.08em]">Reply</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {TEMPLATES.map((t) => (
                <button
                  key={t.label}
                  onClick={() => setMessage(t.body)}
                  className="border border-foreground/20 px-3 py-1.5 text-xs uppercase tracking-[0.1em] text-foreground/70"
                >
                  {t.label}
                </button>
              ))}
            </div>
            <textarea
              className="mt-3 h-44 w-full border border-foreground/20 bg-transparent p-3 text-sm"
              placeholder="Write your message to the pool owner"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <label className="mt-2 flex items-center gap-2 text-sm text-foreground/70">
              <input
                type="checkbox"
                checked={alsoText}
                disabled={!b.sms_opt_in}
                onChange={(e) => setAlsoText(e.target.checked)}
              />
              Send as a text too{b.sms_opt_in ? "" : " (no text consent on file)"}
            </label>
            <button
              onClick={() => void onReply()}
              disabled={sending}
              className="mt-3 bg-[#8E1F2C] px-5 py-2 text-sm uppercase tracking-[0.12em] text-[#F4EFE3] disabled:opacity-60"
            >
              {sending ? "Sending" : "Send reply"}
            </button>

            <h2 className="mt-10 font-display text-xl uppercase tracking-[0.08em]">
              Schedule the visit
            </h2>
            <label className="mt-3 block text-[11px] uppercase tracking-[0.16em] text-foreground/50">
              Visit date
            </label>
            <input
              type="date"
              className="mt-1 w-full border border-foreground/20 bg-transparent px-3 py-2 text-sm"
              value={visitDate}
              onChange={(e) => setVisitDate(e.target.value)}
            />
            <label className="mt-3 block text-[11px] uppercase tracking-[0.16em] text-foreground/50">
              Time window
            </label>
            <select
              className="mt-1 w-full border border-foreground/20 bg-transparent px-3 py-2 text-sm"
              value={visitWindow}
              onChange={(e) => setVisitWindow(e.target.value)}
            >
              <option>8:00 AM to 11:00 AM</option>
              <option>11:00 AM to 1:00 PM</option>
              <option>1:00 PM to 4:00 PM</option>
              <option>4:00 PM to 6:00 PM</option>
            </select>
            <textarea
              className="mt-3 h-20 w-full border border-foreground/20 bg-transparent p-3 text-sm"
              placeholder="Note for the tech (gate code, dog, equipment)"
              value={visitNote}
              onChange={(e) => setVisitNote(e.target.value)}
            />
            <button
              onClick={() => void onSchedule()}
              disabled={scheduling}
              className="mt-3 border border-[#8E1F2C] px-5 py-2 text-sm uppercase tracking-[0.12em] text-[#8E1F2C] disabled:opacity-60"
            >
              {scheduling ? "Scheduling" : "Schedule visit"}
            </button>

            {data.visits.length > 0 && (
              <ul className="mt-4 space-y-2 text-sm text-foreground/70">
                {data.visits.map((v) => (
                  <li key={v.id} className="border border-foreground/15 p-2">
                    {v.scheduled_date} · {v.status}
                    {v.notes ? <span className="block text-foreground/50">{v.notes}</span> : null}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
