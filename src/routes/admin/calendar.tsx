import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getCalendar, type CalendarEntry } from "@/lib/bookings-calendar.functions";
import { AREA_NAMES, OTHER_AREA } from "@/lib/booking-stage";

export const Route = createFileRoute("/admin/calendar")({
  component: CalendarPage,
  head: () => ({
    meta: [
      { title: "Bookings Calendar · Savvy Swim Admin" },
      {
        name: "description",
        content: "Internal Savvy Swim calendar of upcoming pool visits and booking requests by service area.",
      },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Bookings Calendar · Savvy Swim Admin" },
      { property: "og:description", content: "Upcoming pool visits by service area." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const AREAS = [...AREA_NAMES, OTHER_AREA];
// Brand-derived swatches: burgundy, aqua and warm shades, one per area.
const PALETTE = [
  "#8E1F2C", "#1FA9BE", "#B3323A", "#0E6E7C", "#C2703D", "#5A1418",
  "#3E8E6E", "#7A4E8C", "#D19A2A", "#2F5D8A", "#A34E63", "#4F6B2F", "#6C7278",
];
const colorFor = (area: string) => PALETTE[Math.max(0, AREAS.indexOf(area)) % PALETTE.length]!;

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};
const startOfWeek = (d: Date) => addDays(new Date(d.getFullYear(), d.getMonth(), d.getDate()), -d.getDay());

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
      <input className="mt-6 w-full border border-foreground/20 bg-transparent px-3 py-2 text-sm" type="email" placeholder="you@savvyswim.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <input className="mt-3 w-full border border-foreground/20 bg-transparent px-3 py-2 text-sm" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      <button className="mt-5 w-full bg-[#8E1F2C] px-4 py-2 text-sm uppercase tracking-[0.12em] text-[#F4EFE3] disabled:opacity-60" disabled={busy} type="submit">
        {busy ? "Checking" : "Sign in"}
      </button>
    </form>
  );
}

function Entry({ e }: { e: CalendarEntry }) {
  const color = colorFor(e.area);
  const body = (
    <div
      className={`border-l-4 px-2 py-1 text-[12px] leading-tight ${e.kind === "requested" ? "border border-dashed bg-transparent" : "bg-foreground/[0.04]"}`}
      style={{ borderLeftColor: color, borderColor: e.kind === "requested" ? color : undefined, borderLeftStyle: "solid" }}
    >
      <div className="font-semibold">{e.name}</div>
      <div className="text-foreground/60">
        {e.window ?? "Any time"}
        {e.city ? ` · ${e.city}` : ""}
      </div>
      {e.kind === "requested" ? (
        <div className="text-[10px] uppercase tracking-[0.12em]" style={{ color }}>Requested</div>
      ) : e.status === "completed" ? (
        <div className="text-[10px] uppercase tracking-[0.12em] text-foreground/50">Done</div>
      ) : null}
    </div>
  );
  return e.requestId ? (
    <Link to="/admin/bookings/$id" params={{ id: e.requestId }} className="block hover:opacity-80">
      {body}
    </Link>
  ) : (
    body
  );
}

function CalendarPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [view, setView] = useState<"week" | "month">("week");
  const [anchor, setAnchor] = useState(() => new Date());
  const [area, setArea] = useState<string>("all");
  const fetchCal = useServerFn(getCalendar);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setAuthed(Boolean(data.session)));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setAuthed(Boolean(s)));
    return () => sub.subscription.unsubscribe();
  }, []);

  const days = useMemo(() => {
    if (view === "week") {
      const s = startOfWeek(anchor);
      return Array.from({ length: 7 }, (_, i) => addDays(s, i));
    }
    const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    const s = startOfWeek(first);
    const last = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
    const n = Math.ceil((last.getTime() - s.getTime()) / 86_400_000 / 7 + 0.0001) * 7;
    return Array.from({ length: Math.max(28, n) }, (_, i) => addDays(s, i));
  }, [view, anchor]);

  const from = iso(days[0]!);
  const to = iso(days[days.length - 1]!);
  const query = useQuery({
    queryKey: ["admin-calendar", from, to],
    queryFn: () => fetchCal({ data: { from, to } }),
    enabled: authed === true,
  });

  const entries = useMemo(
    () => (query.data?.entries ?? []).filter((e) => area === "all" || e.area === area),
    [query.data, area],
  );
  const byDay = useMemo(() => {
    const m = new Map<string, CalendarEntry[]>();
    for (const e of entries) {
      if (!m.has(e.date)) m.set(e.date, []);
      m.get(e.date)!.push(e);
    }
    for (const list of m.values()) list.sort((a, b) => a.area.localeCompare(b.area));
    return m;
  }, [entries]);
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of query.data?.entries ?? []) m.set(e.area, (m.get(e.area) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [query.data]);

  if (authed === null) return <div className="p-10 text-sm text-foreground/60">Loading</div>;
  if (!authed) return <SignIn onDone={() => setAuthed(true)} />;

  const step = (dir: number) =>
    setAnchor((a) => (view === "week" ? addDays(a, dir * 7) : new Date(a.getFullYear(), a.getMonth() + dir, 1)));
  const title =
    view === "week"
      ? `${days[0]!.toLocaleDateString("en-US", { month: "short", day: "numeric" })} to ${days[6]!.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
      : anchor.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const today = iso(new Date());

  return (
    <main className="mx-auto max-w-7xl px-5 py-12">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-foreground/15 pb-6">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-[#8E1F2C]">Savvy Swim · Admin</p>
          <h1 className="font-display text-4xl uppercase tracking-[0.04em]">Bookings calendar</h1>
          <p className="mt-1 text-sm text-foreground/60">
            Visits on the schedule and requested days, by service area. Dashed entries are requests not yet booked.
          </p>
        </div>
        <Link to="/admin/bookings" className="border border-foreground/25 px-4 py-2 text-xs uppercase tracking-[0.14em] hover:text-[#8E1F2C]">
          Booking requests
        </Link>
      </header>

      <nav className="mt-6 flex flex-wrap items-center gap-2">
        <button onClick={() => step(-1)} className="border border-foreground/20 px-3 py-2 text-xs uppercase" aria-label="Previous">Prev</button>
        <button onClick={() => setAnchor(new Date())} className="border border-foreground/20 px-3 py-2 text-xs uppercase tracking-[0.14em]">Today</button>
        <button onClick={() => step(1)} className="border border-foreground/20 px-3 py-2 text-xs uppercase" aria-label="Next">Next</button>
        <span className="ml-2 font-display text-xl uppercase tracking-[0.04em]">{title}</span>
        <div className="ml-auto flex gap-2">
          {(["week", "month"] as const).map((v) => (
            <button key={v} onClick={() => setView(v)} className={`px-4 py-2 text-xs uppercase tracking-[0.14em] ${view === v ? "bg-[#8E1F2C] text-[#F4EFE3]" : "border border-foreground/20 text-foreground/70"}`}>
              {v}
            </button>
          ))}
        </div>
      </nav>

      <div className="mt-4 flex flex-wrap gap-2">
        <button onClick={() => setArea("all")} className={`px-3 py-1.5 text-xs uppercase tracking-[0.1em] ${area === "all" ? "bg-foreground text-background" : "border border-foreground/20"}`}>
          All areas
        </button>
        {AREAS.map((a) => (
          <button key={a} onClick={() => setArea(a)} className={`flex items-center gap-1.5 px-3 py-1.5 text-xs uppercase tracking-[0.1em] ${area === a ? "bg-foreground text-background" : "border border-foreground/20"}`}>
            <span className="inline-block h-2.5 w-2.5" style={{ background: colorFor(a) }} />
            {a}
          </button>
        ))}
      </div>

      <p className="mt-4 text-sm text-foreground/70">
        {counts.length ? counts.map(([a, n]) => `${a} ${n}`).join(", ") : "Nothing on the calendar for this period."}
      </p>

      {query.error ? <p className="mt-4 text-sm text-[#8E1F2C]">{(query.error as Error).message}</p> : null}

      <div className="mt-4 overflow-x-auto">
        <div className="grid min-w-[900px] grid-cols-7 border-l border-t border-foreground/15">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="border-b border-r border-foreground/15 px-2 py-1 text-[11px] uppercase tracking-[0.14em] text-foreground/50">{d}</div>
          ))}
          {days.map((d) => {
            const k = iso(d);
            const list = byDay.get(k) ?? [];
            const dim = view === "month" && d.getMonth() !== anchor.getMonth();
            return (
              <div key={k} className={`border-b border-r border-foreground/15 p-1.5 ${view === "week" ? "min-h-[360px]" : "min-h-[120px]"} ${dim ? "opacity-40" : ""}`}>
                <div className={`mb-1 text-xs ${k === today ? "font-bold text-[#8E1F2C]" : "text-foreground/60"}`}>
                  {d.getDate()}
                  {list.length ? <span className="ml-1 text-foreground/40">({list.length})</span> : null}
                </div>
                <div className="space-y-1">
                  {list.map((e) => (
                    <Entry key={e.key} e={e} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {query.isLoading ? <p className="mt-4 text-sm text-foreground/55">Loading the calendar</p> : null}
    </main>
  );
}
