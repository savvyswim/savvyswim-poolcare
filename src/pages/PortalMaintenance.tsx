import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "@/lib/router-compat";
import { ArrowLeft, CalendarClock, CheckCircle2, LogOut, MapPin, Repeat, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type Pool = {
  id: string;
  full_name: string;
  address: string | null;
  city: string | null;
  service_level: string;
  route_day: string | null;
  last_filter_clean_at: string | null;
  filter_interval_days: number;
};

type Visit = {
  id: string;
  customer_id: string;
  scheduled_date: string;
  status: string;
  completed_at: string | null;
};

type Job = {
  id: string;
  customer_id: string;
  title: string;
  details: string | null;
  status: string;
  due_date: string | null;
  completed_at: string | null;
};

const DAY = 86400000;
const fmt = (d: string | Date) =>
  new Date(typeof d === "string" ? `${d.slice(0, 10)}T12:00:00` : d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

export default function PortalMaintenance() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [pools, setPools] = useState<Pool[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    if (!loading && !user) navigate("/auth?next=/portal/maintenance", { replace: true });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    (async () => {
      setBusy(true);
      const { data: poolRows } = await supabase.rpc("ss_my_pool");
      const mine = ((poolRows as Pool[] | null) ?? []).filter(Boolean);
      if (!alive) return;
      setPools(mine);
      setActiveId((prev) => prev ?? mine[0]?.id ?? null);

      if (mine.length) {
        const ids = mine.map((p) => p.id);
        const since = new Date(Date.now() - 400 * DAY).toISOString().slice(0, 10);
        const [{ data: v }, { data: j }] = await Promise.all([
          supabase
            .from("ss_visits")
            .select("id,customer_id,scheduled_date,status,completed_at")
            .in("customer_id", ids)
            .gte("scheduled_date", since)
            .order("scheduled_date", { ascending: false }),
          supabase
            .from("ss_jobs")
            .select("id,customer_id,title,details,status,due_date,completed_at")
            .in("customer_id", ids)
            .order("due_date", { ascending: true, nullsFirst: false }),
        ]);
        if (!alive) return;
        setVisits((v as Visit[]) ?? []);
        setJobs((j as Job[]) ?? []);
      }
      setBusy(false);
    })();
    return () => {
      alive = false;
    };
  }, [user]);

  const pool = useMemo(() => pools.find((p) => p.id === activeId) ?? null, [pools, activeId]);
  const poolVisits = useMemo(() => visits.filter((v) => v.customer_id === activeId), [visits, activeId]);
  const poolJobs = useMemo(() => jobs.filter((j) => j.customer_id === activeId), [jobs, activeId]);

  // ---- Upcoming maintenance -------------------------------------------------
  const upcoming = useMemo(() => {
    if (!pool) return [];
    const items: {
      key: string;
      title: string;
      cadence: string; // "One-time" | "Every N days" | "Weekly"
      recurring: boolean;
      due: Date | null;
      overdue: boolean;
      note?: string;
    }[] = [];

    // Next weekly service visit
    const nextVisit = [...poolVisits].reverse().find((v) => v.status !== "completed");
    items.push({
      key: "weekly",
      title: "Weekly pool service",
      cadence: pool.route_day ? `Weekly · ${pool.route_day}s` : "Weekly",
      recurring: true,
      due: nextVisit ? new Date(`${nextVisit.scheduled_date}T12:00:00`) : null,
      overdue: false,
      note: nextVisit ? undefined : "Next visit being scheduled",
    });

    // Filter clean — recurring every N days
    const interval = pool.filter_interval_days || 90;
    const last = pool.last_filter_clean_at ? new Date(`${pool.last_filter_clean_at}T12:00:00`) : null;
    const due = last ? new Date(last.getTime() + interval * DAY) : null;
    items.push({
      key: "filter",
      title: "Filter cleaning",
      cadence: `Every ${interval} days`,
      recurring: true,
      due,
      overdue: !!due && due.getTime() < Date.now(),
      note: last ? `Last cleaned ${fmt(pool.last_filter_clean_at!)}` : "No filter clean on record yet",
    });

    // One-time jobs not yet completed
    for (const j of poolJobs.filter((j) => j.status !== "completed" && j.status !== "cancelled")) {
      items.push({
        key: j.id,
        title: j.title,
        cadence: "One-time",
        recurring: false,
        due: j.due_date ? new Date(`${j.due_date}T12:00:00`) : null,
        overdue: !!j.due_date && new Date(`${j.due_date}T12:00:00`).getTime() < Date.now(),
        note: j.details ?? undefined,
      });
    }

    return items.sort((a, b) => (a.due?.getTime() ?? Infinity) - (b.due?.getTime() ?? Infinity));
  }, [pool, poolVisits, poolJobs]);

  // ---- Past clean dates -----------------------------------------------------
  const past = useMemo(() => {
    const done: { key: string; title: string; date: string; recurring: boolean }[] = [];
    for (const v of poolVisits.filter((v) => v.status === "completed")) {
      done.push({
        key: v.id,
        title: "Pool cleaning & service",
        date: v.completed_at ?? v.scheduled_date,
        recurring: true,
      });
    }
    for (const j of poolJobs.filter((j) => j.status === "completed")) {
      done.push({
        key: j.id,
        title: j.title,
        date: j.completed_at ?? j.due_date ?? "",
        recurring: false,
      });
    }
    return done
      .filter((d) => d.date)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 30);
  }, [poolVisits, poolJobs]);

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="border-b border-hairline bg-background">
        <div className="container-tight flex h-16 items-center justify-between gap-3 sm:h-[76px]">
          <Link to="/portal" aria-label="Savvy Swim — my pools" className="flex min-w-0 items-center">
            <span className="truncate font-display text-[1.25rem] uppercase leading-none tracking-tight text-accent sm:text-[1.7rem]">
              Savvy Swim
            </span>
          </Link>
          <button
            type="button"
            onClick={() => signOut()}
            className="inline-flex items-center gap-2 border border-primary/20 px-3 py-2 font-tech text-xs uppercase text-primary hover:border-primary"
          >
            <LogOut className="h-3.5 w-3.5" /> Sign out
          </button>
        </div>
      </header>

      <main className="container-tight py-10 sm:py-14">
        <Link
          to="/portal"
          className="inline-flex items-center gap-1.5 font-tech text-xs uppercase tracking-wide text-primary/60 hover:text-accent"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> My pool
        </Link>
        <h1 className="mt-3 font-display text-3xl uppercase leading-none tracking-tight sm:text-5xl">
          Maintenance
        </h1>

        {busy && <p className="mt-6 font-tech text-sm text-primary/60">Loading your schedule…</p>}

        {!busy && !pools.length && (
          <div className="mt-8 border border-hairline p-6">
            <p className="font-tech text-sm text-primary/70">
              We couldn&rsquo;t find a pool linked to this account yet. Call the office and we&rsquo;ll connect it.
            </p>
          </div>
        )}

        {!busy && pools.length > 0 && (
          <>
            {pools.length > 1 && (
              <div className="mt-6 flex flex-wrap gap-2">
                {pools.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setActiveId(p.id)}
                    aria-pressed={p.id === activeId}
                    className={`inline-flex items-center gap-1.5 border px-3 py-2 font-tech text-[11px] uppercase tracking-wide ${
                      p.id === activeId
                        ? "border-accent bg-accent/10 text-accent"
                        : "border-hairline text-primary/60 hover:border-primary/40"
                    }`}
                  >
                    <MapPin className="h-3 w-3" aria-hidden="true" />
                    {p.address ?? p.full_name}
                  </button>
                ))}
              </div>
            )}

            {/* Upcoming */}
            <section className="mt-8">
              <h2 className="font-tech text-[11px] uppercase tracking-[0.22em] text-primary/50">
                Upcoming maintenance
              </h2>
              <div className="mt-3 space-y-2">
                {upcoming.map((u) => (
                  <div
                    key={u.key}
                    className={`flex flex-wrap items-center justify-between gap-3 border p-4 ${
                      u.overdue ? "border-accent bg-accent/5" : "border-hairline"
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="font-display text-base uppercase leading-tight">{u.title}</p>
                      {u.note && <p className="mt-1 font-tech text-xs text-primary/55">{u.note}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1.5 border px-2.5 py-1 font-tech text-[10px] uppercase tracking-widest ${
                          u.recurring
                            ? "border-primary/25 text-primary/70"
                            : "border-accent/40 text-accent"
                        }`}
                      >
                        {u.recurring ? (
                          <Repeat className="h-3 w-3" aria-hidden="true" />
                        ) : (
                          <Sparkles className="h-3 w-3" aria-hidden="true" />
                        )}
                        {u.cadence}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1.5 font-tech text-xs ${
                          u.overdue ? "font-semibold text-accent" : "text-primary/70"
                        }`}
                      >
                        <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
                        {u.due ? (u.overdue ? `Due — was ${fmt(u.due)}` : fmt(u.due)) : "Scheduling"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Past clean dates */}
            <section className="mt-10">
              <h2 className="font-tech text-[11px] uppercase tracking-[0.22em] text-primary/50">
                Past clean dates
              </h2>
              {!past.length ? (
                <p className="mt-3 font-tech text-sm text-primary/60">No completed visits yet.</p>
              ) : (
                <ul className="mt-3 divide-y divide-hairline border border-hairline">
                  {past.map((d) => (
                    <li key={d.key} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                      <span className="inline-flex items-center gap-2 font-tech text-sm text-primary/80">
                        <CheckCircle2 className="h-4 w-4 text-accent" aria-hidden="true" />
                        {d.title}
                      </span>
                      <span className="flex items-center gap-2">
                        <span className="font-tech text-[10px] uppercase tracking-widest text-primary/45">
                          {d.recurring ? "Routine" : "One-time"}
                        </span>
                        <span className="font-tech text-xs text-primary/70">{fmt(d.date)}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
