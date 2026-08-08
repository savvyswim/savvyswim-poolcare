import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "@/lib/router-compat";
import {
  CalendarClock,
  CalendarPlus,

  CheckCircle2,
  CloudRain,
  Download,
  Droplets,
  FileText,
  FlaskConical,
  Lock,
  LogOut,
  MapPin,
  Receipt,
  Share2,
  Unlock,
  Waves,
} from "lucide-react";
import { toast } from "sonner";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import PortalScheduleDialog, { VISIT_SLOTS } from "@/components/PortalScheduleDialog";
import { downloadIcs, googleCalendarUrl } from "@/lib/calendar";

import { useAuth } from "@/hooks/useAuth";
import { MARKETING_ORIGIN } from "@/hooks/useAppHost";
import AutopayCard from "@/components/AutopayCard";
import PortalTickets from "@/components/PortalTickets";
import PortalDocuments from "@/components/PortalDocuments";
import PortalDamageReport from "@/components/PortalDamageReport";

import PortalProfile from "@/components/PortalProfile";
import PortalAddresses, { formatAddress, type ServiceAddress } from "@/components/PortalAddresses";
import PortalActivity from "@/components/PortalActivity";
import PortalChemHistory from "@/components/PortalChemHistory";

import PortalPayDialog, { type PayableInvoice } from "@/components/PortalPayDialog";
import { TARGETS, evaluate, type MetricKey, type Readings } from "@/crm/lib/chem";
import { buildWaterReportPdf } from "@/lib/waterReportPdf";


type Pool = {
  id: string;
  full_name: string;
  address: string | null;
  city: string | null;
  service_level: string;
  pool_type: string;
  gallons: number;
  route_day: string | null;
  monthly_price: number;
  referral_code: string | null;
  status: string;
  last_filter_clean_at: string | null;
  filter_interval_days: number;
};

function filterDue(p: Pool): number | null {
  if (!p.last_filter_clean_at) return null;
  const days = Math.floor((Date.now() - new Date(p.last_filter_clean_at).getTime()) / 86400000);
  return days > (p.filter_interval_days || 90) ? days : null;
}

type VisitPhoto = { label?: string; url?: string; path?: string };

type Visit = {
  id: string;
  customer_id: string;
  scheduled_date: string;
  status: string;
  completed_at: string | null;
  readings: Readings | null;
  notes: string | null;
  photos: VisitPhoto[] | null;
  after_photo_url: string | null;
  is_locked: boolean | null;
  rain_hold: boolean | null;
};


type Invoice = {
  id: string;
  customer_id: string;
  invoice_number: string;
  amount: number;
  status: string;
  issued_on: string;
  due_date: string | null;
  stripe_payment_url: string | null;
};

const money = (n: number) => `$${Number(n || 0).toFixed(2)}`;
const RANGES = [30, 60, 90] as const;
const CHART_METRICS: MetricKey[] = ["fc", "ph", "ta", "ch", "cyc", "psi"];

export default function Portal() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [pools, setPools] = useState<Pool[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [busy, setBusy] = useState(true);
  const [days, setDays] = useState<(typeof RANGES)[number]>(90);
  const [metric, setMetric] = useState<MetricKey>("fc");
  const [resched, setResched] = useState<{
    pool: Pool;
    date: string;
    note: string;
    originalDate: string | null;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [payInvoice, setPayInvoice] = useState<PayableInvoice | null>(null);
  const [serviceAddress, setServiceAddress] = useState<ServiceAddress | null>(null);


  useEffect(() => {
    if (!loading && !user) navigate("/auth?next=/portal", { replace: true });
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
        const since = new Date(Date.now() - 400 * 86400000).toISOString().slice(0, 10);
        const [{ data: v }, { data: inv }] = await Promise.all([
          supabase
            .from("ss_visits")
            .select(
              "id,customer_id,scheduled_date,status,completed_at,readings,notes,photos,after_photo_url,is_locked,rain_hold",
            )

            .in("customer_id", ids)
            .gte("scheduled_date", since)
            .order("scheduled_date", { ascending: false }),
          supabase
            .from("ss_invoices")
            .select("id,customer_id,invoice_number,amount,status,issued_on,due_date,stripe_payment_url")
            .in("customer_id", ids)
            .order("issued_on", { ascending: false })
            .limit(50),
        ]);
        if (!alive) return;
        setVisits((v as unknown as Visit[]) ?? []);
        setInvoices((inv as unknown as Invoice[]) ?? []);
      }
      setBusy(false);
    })();
    return () => {
      alive = false;
    };
  }, [user]);

  const pool = useMemo(() => pools.find((p) => p.id === activeId) ?? null, [pools, activeId]);
  const poolVisits = useMemo(
    () => visits.filter((v) => v.customer_id === activeId),
    [visits, activeId],
  );
  const poolInvoices = useMemo(
    () => invoices.filter((i) => i.customer_id === activeId),
    [invoices, activeId],
  );

  const balance = useMemo(
    () => poolInvoices.filter((i) => i.status !== "paid").reduce((s, i) => s + Number(i.amount || 0), 0),
    [poolInvoices],
  );
  const nextVisit = useMemo(
    () => [...poolVisits].reverse().find((v) => v.status !== "completed") ?? null,
    [poolVisits],
  );
  const lastReport = useMemo(
    () => poolVisits.find((v) => v.status === "completed" && v.readings) ?? null,
    [poolVisits],
  );

  const chartData = useMemo(() => {
    const cutoff = Date.now() - days * 86400000;
    return poolVisits
      .filter((v) => v.readings && new Date(v.scheduled_date).getTime() >= cutoff)
      .map((v) => ({
        date: new Date(v.scheduled_date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        ts: new Date(v.scheduled_date).getTime(),
        value: (v.readings as Record<string, number | undefined>)?.[metric] ?? null,
      }))
      .filter((d) => typeof d.value === "number")
      .sort((a, b) => a.ts - b.ts);
  }, [poolVisits, days, metric]);

  // ---- Visit scheduling / holds -------------------------------------------
  async function refreshVisits() {
    if (!pools.length) return;
    const since = new Date(Date.now() - 400 * 86400000).toISOString().slice(0, 10);
    const { data } = await supabase
      .from("ss_visits")
      .select(
        "id,customer_id,scheduled_date,status,completed_at,readings,notes,photos,after_photo_url,is_locked,rain_hold",
      )
      .in(
        "customer_id",
        pools.map((p) => p.id),
      )
      .gte("scheduled_date", since)
      .order("scheduled_date", { ascending: false });
    setVisits((data as unknown as Visit[]) ?? []);
  }

  async function refreshInvoices() {
    if (!pools.length) return;
    const { data } = await supabase
      .from("ss_invoices")
      .select("id,customer_id,invoice_number,amount,status,issued_on,due_date,stripe_payment_url")
      .in(
        "customer_id",
        pools.map((p) => p.id),
      )
      .order("issued_on", { ascending: false })
      .limit(50);
    setInvoices((data as unknown as Invoice[]) ?? []);
  }



  function openReschedule(p: Pool, current: string | null) {
    setResched({ pool: p, date: current ?? new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10), note: "" });
  }

  async function submitReschedule(date: string, note: string): Promise<boolean> {
    if (!resched) return false;
    setSaving(true);
    const addressLine = serviceAddress
      ? `Service address: ${serviceAddress.label} — ${formatAddress(serviceAddress)}`
      : "";
    const fullNote = [addressLine, note].filter(Boolean).join("\n");
    const { data, error } = await supabase.rpc("ss_request_visit_reschedule", {
      p_customer_id: resched.pool.id,
      p_date: date,
      ...(fullNote ? { p_note: fullNote } : {}),
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return false;
    }
    const info = (data ?? {}) as Record<string, unknown>;
    const when = new Date(`${date}T12:00:00`).toLocaleDateString();
    await refreshVisits();
    toast.success(`Visit set for ${when} — confirmation sent to the office.`);

    supabase.functions
      .invoke("notify-office-request", {
        body: {
          requestType: "Portal visit scheduling",
          name: String(info["customer_name"] ?? "Customer"),
          email: String(info["email"] ?? user?.email ?? "no-reply@savvyswim.com"),
          phone: info["phone"] ? String(info["phone"]) : undefined,
          address: info["address"] ? String(info["address"]) : undefined,
          service: `Weekly pool service — ${String(info["service_level"] ?? "service")}`,
          preferredDate: when,
          notes: note || "Scheduled from the customer portal.",
          sourceUrl: window.location.href,
        },
      })
      .catch(() => undefined);

    return true;
  }


  async function toggleFlag(p: Pool, flag: "lock" | "rain", value: boolean) {
    const { error } = await supabase.rpc("ss_set_visit_flag", {
      p_customer_id: p.id,
      p_flag: flag,
      p_value: value,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    await refreshVisits();
    toast.success(
      flag === "lock"
        ? value
          ? "Visit locked — the date won't change."
          : "Visit unlocked."
        : value
          ? "Rain day flagged — we'll reschedule and confirm."
          : "Rain day cleared.",
    );
  }

  // ---- Branded PDF report --------------------------------------------------
  function reportPdf(p: Pool, visit: Visit) {
    return buildWaterReportPdf({
      address: p.address ?? p.full_name,
      city: p.city,
      customerName: p.full_name,
      servicePlan: p.service_level,
      gallons: p.gallons,
      visitDate: visit.scheduled_date,
      readings: (visit.readings ?? {}) as Readings,
      notes: visit.notes,
    });
  }

  function downloadReport(p: Pool, visit: Visit) {
    const { blob, filename } = reportPdf(p, visit);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  async function shareReport(p: Pool, visit: Visit) {
    const { blob, filename } = reportPdf(p, visit);
    const file = new File([blob], filename, { type: "application/pdf" });
    const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
    if (nav.canShare?.({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: "Savvy Swim water report",
          text: `Water chemistry report for ${p.address ?? p.full_name}`,
        });
        return;
      } catch {
        /* user cancelled */
      }
    }
    downloadReport(p, visit);
    toast.success("Report downloaded — attach it to share.");
  }


  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="border-b border-hairline bg-background">
        <div className="container-tight flex h-16 items-center justify-between gap-3 sm:h-[76px]">
          <Link to="/portal" aria-label="Savvy Swim — my pools" className="flex min-w-0 items-center">
            <span className="truncate font-display text-[1.25rem] uppercase leading-none tracking-tight text-accent sm:text-[1.7rem]">
              Savvy Swim
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <a
              href={MARKETING_ORIGIN}
              className="hidden font-tech text-xs text-primary/70 hover:text-accent sm:inline"
            >
              savvyswim.com
            </a>
            <button
              type="button"
              onClick={() => signOut()}
              className="inline-flex items-center gap-2 border border-primary/20 px-3 py-2 font-tech text-xs uppercase text-primary hover:border-primary"
            >
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="container-tight py-10 sm:py-14">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h1 className="font-display text-3xl uppercase leading-none tracking-tight sm:text-5xl">
            {pools.length > 1 ? "My pools" : "My pool"}
          </h1>
          <Link
            to="/portal/maintenance"
            className="inline-flex items-center gap-2 border border-primary/25 px-3 py-2 font-tech text-[11px] uppercase tracking-wide text-primary hover:border-accent hover:text-accent"
          >
            <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" /> Maintenance schedule
          </Link>
        </div>

        {busy && <p className="mt-6 font-tech text-sm text-primary/60">Loading your pools…</p>}

        {!busy && !pools.length && (
          <div className="mt-8 border border-hairline p-6">
            <p className="font-tech text-sm text-primary/70">
              We couldn&rsquo;t find a pool linked to this account yet. Call the office and we&rsquo;ll connect it.
            </p>
          </div>
        )}

        {!busy && pools.length > 0 && (
          <>
            {/* Address switcher */}
            <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {pools.map((p) => {
                const last = visits.find(
                  (v) => v.customer_id === p.id && v.status === "completed" && v.readings,
                );
                const upcoming = [...visits]
                  .reverse()
                  .find((v) => v.customer_id === p.id && v.status !== "completed");
                const step = nextStepFor(last?.readings ?? null, p.gallons);
                const isActive = p.id === activeId;
                return (
                  <div
                    key={p.id}
                    className={`border transition-colors ${
                      isActive ? "border-accent bg-accent/5" : "border-hairline hover:border-primary/40"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setActiveId(p.id)}
                      aria-pressed={isActive}
                      className="block w-full p-5 text-left"
                    >
                      <p className="flex items-center gap-1.5 font-tech text-[10px] uppercase tracking-widest text-primary/50">
                        <MapPin className="h-3 w-3" aria-hidden="true" />
                        {p.city ?? "Pool"}
                      </p>
                      <p className="mt-2 font-display text-lg uppercase leading-tight">
                        {p.address ?? p.full_name}
                      </p>
                      <p className="mt-2 font-tech text-xs text-primary/60">
                        Last report{" "}
                        {last ? new Date(last.scheduled_date).toLocaleDateString() : "—"}
                      </p>
                      <p className="mt-1 font-tech text-xs text-accent">{step.headline}</p>
                    </button>
                    <div className="border-t border-hairline px-5 py-3">
                      <p className="font-tech text-[11px] text-primary/55">
                        {p.route_day ? `${p.route_day}s, weekly` : "Weekly service"} ·{" "}
                        {upcoming
                          ? `next ${new Date(upcoming.scheduled_date).toLocaleDateString()}`
                          : "next visit scheduling"}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => openReschedule(p, upcoming?.scheduled_date ?? null)}
                          disabled={!!upcoming?.is_locked}
                          className="inline-flex items-center gap-2 border border-primary/25 px-3 py-2 font-tech text-[11px] uppercase tracking-wide text-primary hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-45"
                        >
                          <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
                          {upcoming ? "Reschedule visit" : "Schedule visit"}
                        </button>
                        {last && (
                          <button
                            type="button"
                            onClick={() => downloadReport(p, last)}
                            className="inline-flex items-center gap-2 border border-primary/25 px-3 py-2 font-tech text-[11px] uppercase tracking-wide text-primary hover:border-accent hover:text-accent"
                          >
                            <Download className="h-3.5 w-3.5" aria-hidden="true" /> Report PDF
                          </button>
                        )}
                      </div>

                      {/* Holds */}
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          disabled={!upcoming}
                          onClick={() => toggleFlag(p, "lock", !upcoming?.is_locked)}
                          aria-pressed={!!upcoming?.is_locked}
                          className={`flex items-center gap-2 border px-3 py-2 text-left font-tech text-[10px] uppercase tracking-widest disabled:opacity-40 ${
                            upcoming?.is_locked
                              ? "border-accent bg-accent/10 text-accent"
                              : "border-hairline text-primary/60 hover:border-primary/40"
                          }`}
                        >
                          {upcoming?.is_locked ? (
                            <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                          ) : (
                            <Unlock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                          )}
                          {upcoming?.is_locked ? "Locked" : "Lock date"}
                        </button>
                        <button
                          type="button"
                          disabled={!upcoming}
                          onClick={() => toggleFlag(p, "rain", !upcoming?.rain_hold)}
                          aria-pressed={!!upcoming?.rain_hold}
                          className={`flex items-center gap-2 border px-3 py-2 text-left font-tech text-[10px] uppercase tracking-widest disabled:opacity-40 ${
                            upcoming?.rain_hold
                              ? "border-accent bg-accent/10 text-accent"
                              : "border-hairline text-primary/60 hover:border-primary/40"
                          }`}
                        >
                          <CloudRain className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                          {upcoming?.rain_hold ? "Rain day" : "Rain day?"}
                        </button>
                      </div>
                      {upcoming?.is_locked && (
                        <p className="mt-2 font-tech text-[10px] uppercase tracking-widest text-primary/45">
                          Locked — unlock to move this visit
                        </p>
                      )}
                      {upcoming?.rain_hold && (
                        <p className="mt-1 font-tech text-[10px] uppercase tracking-widest text-accent">
                          Can&rsquo;t be performed — office notified
                        </p>
                      )}
                    </div>

                  </div>
                );
              })}

            </section>

            {pool && (
              <>
                {filterDue(pool) != null && (
                  <section className="mt-6 border border-accent bg-accent/10 p-5">
                    <p className="font-tech text-[10px] uppercase tracking-widest text-accent">
                      Filter cleaning due
                    </p>
                    <p className="mt-2 font-display text-xl uppercase leading-tight">
                      It&rsquo;s been {filterDue(pool)} days since your last deep filter clean
                    </p>
                    <p className="mt-2 font-tech text-xs text-primary/70">
                      We recommend a full filter cleaning every {pool.filter_interval_days || 90} days
                      to protect your equipment and keep water crystal clear. Text or call{" "}
                      <a href="sms:+14697440379" className="text-accent underline">
                        (469) 744-0379
                      </a>{" "}
                      to book it.
                    </p>
                  </section>
                )}
                <section className="mt-10 grid gap-4 sm:grid-cols-3">
                  <div className="border border-hairline p-5">
                    <p className="font-tech text-[10px] uppercase tracking-widest text-primary/50">Service plan</p>
                    <p className="mt-2 font-display text-2xl uppercase leading-none">{pool.service_level}</p>
                    <p className="mt-2 font-tech text-xs text-primary/60">
                      {money(pool.monthly_price)}/mo · {pool.route_day ?? "Day TBD"}
                    </p>
                  </div>
                  <div className="border border-hairline p-5">
                    <p className="font-tech text-[10px] uppercase tracking-widest text-primary/50">Next visit</p>
                    <p className="mt-2 font-display text-2xl uppercase leading-none">
                      {nextVisit ? new Date(nextVisit.scheduled_date).toLocaleDateString() : "Scheduling"}
                    </p>
                    <p className="mt-2 font-tech text-xs text-primary/60">{pool.city ?? ""}</p>
                  </div>
                  <div className="border border-hairline p-5">
                    <p className="font-tech text-[10px] uppercase tracking-widest text-primary/50">Balance</p>
                    <p className="mt-2 font-display text-2xl uppercase leading-none">{money(balance)}</p>
                    <p className="mt-2 font-tech text-xs text-primary/60">
                      {pool.pool_type} · {pool.gallons.toLocaleString()} gal
                    </p>
                  </div>
                </section>

                {/* Upcoming visit */}
                <section className="mt-10 border border-hairline">
                  <div className="flex flex-wrap items-start justify-between gap-4 p-6">
                    <div className="min-w-0">
                      <p className="font-tech text-[10px] uppercase tracking-widest text-primary/50">
                        Upcoming visit
                      </p>
                      <h2 className="mt-2 font-display text-3xl uppercase leading-none">
                        {nextVisit
                          ? new Date(`${nextVisit.scheduled_date}T12:00:00`).toLocaleDateString(undefined, {
                              weekday: "long",
                              month: "short",
                              day: "numeric",
                            })
                          : "Scheduling"}
                      </h2>
                      <p className="mt-2 font-tech text-xs text-primary/65">
                        {pool.address ?? pool.full_name}
                        {pool.city ? `, ${pool.city}` : ""} · {pool.service_level} ·{" "}
                        {pool.route_day ? `${pool.route_day} route` : "route day TBD"}
                      </p>
                      <ul className="mt-3 space-y-1 font-tech text-xs text-primary/65">
                        <li>Arrival window 8:00a – 4:00p — your tech texts on the way.</li>
                        <li>Full chemistry test, brush, skim, baskets and filter pressure check.</li>
                        <li>
                          {nextVisit?.rain_hold
                            ? "Rain day flagged — we'll move it and confirm."
                            : "Please leave the gate unlocked and pets inside."}
                        </li>
                        <li>
                          Automatic reminder the afternoon before — sent by text or email to match the
                          preference you set in Property profile below.
                        </li>
                      </ul>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {nextVisit?.is_locked && (
                          <span className="border border-accent px-2 py-1 font-tech text-[10px] uppercase tracking-widest text-accent">
                            Date confirmed
                          </span>
                        )}
                        {nextVisit?.rain_hold && (
                          <span className="border border-primary/25 px-2 py-1 font-tech text-[10px] uppercase tracking-widest text-primary/70">
                            Rain hold
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex w-full flex-col gap-2 sm:w-auto">
                      <button
                        type="button"
                        onClick={() => toggleFlag(pool, "lock", !nextVisit?.is_locked)}
                        disabled={!nextVisit}
                        className="inline-flex items-center justify-center gap-2 border border-primary/25 px-4 py-2 font-tech text-[11px] uppercase tracking-wide text-primary hover:border-accent hover:text-accent disabled:opacity-45"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                        {nextVisit?.is_locked ? "Unconfirm date" : "Confirm this date"}
                      </button>
                      <button
                        type="button"
                        onClick={() => openReschedule(pool, nextVisit?.scheduled_date ?? null)}
                        disabled={!!nextVisit?.is_locked}
                        className="inline-flex items-center justify-center gap-2 border border-primary/25 px-4 py-2 font-tech text-[11px] uppercase tracking-wide text-primary hover:border-accent hover:text-accent disabled:opacity-45"
                      >
                        <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
                        {nextVisit ? "Reschedule" : "Request a visit"}
                      </button>
                      {nextVisit && (
                        <div className="flex gap-2">
                          <a
                            href={googleCalendarUrl(visitEvent(pool, nextVisit))}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex flex-1 items-center justify-center gap-2 border border-primary/25 px-3 py-2 font-tech text-[11px] uppercase tracking-wide text-primary hover:border-accent hover:text-accent"
                          >
                            <CalendarPlus className="h-3.5 w-3.5" aria-hidden="true" />
                            Google
                          </a>
                          <button
                            type="button"
                            onClick={() => downloadIcs(visitEvent(pool, nextVisit))}
                            className="inline-flex flex-1 items-center justify-center gap-2 border border-primary/25 px-3 py-2 font-tech text-[11px] uppercase tracking-wide text-primary hover:border-accent hover:text-accent"
                          >
                            <Download className="h-3.5 w-3.5" aria-hidden="true" />
                            .ics
                          </button>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => toggleFlag(pool, "rain", !nextVisit?.rain_hold)}
                        disabled={!nextVisit}
                        className="inline-flex items-center justify-center gap-2 border border-primary/25 px-4 py-2 font-tech text-[11px] uppercase tracking-wide text-primary hover:border-accent hover:text-accent disabled:opacity-45"
                      >
                        <CloudRain className="h-3.5 w-3.5" aria-hidden="true" />
                        {nextVisit?.rain_hold ? "Clear rain day" : "Flag rain day"}
                      </button>
                    </div>
                  </div>
                </section>

                {/* Latest report + next recommended step */}
                <section className="mt-10 border border-hairline p-6">
                  <p className="font-tech text-[10px] uppercase tracking-widest text-primary/50">
                    Latest report ·{" "}
                    {lastReport ? new Date(lastReport.scheduled_date).toLocaleDateString() : "no visits yet"}
                  </p>
                  {(() => {
                    const step = nextStepFor(lastReport?.readings ?? null, pool.gallons);
                    return (
                      <>
                        <h2 className="mt-2 font-display text-2xl uppercase leading-tight">{step.headline}</h2>
                        <p className="mt-2 max-w-2xl text-sm text-primary/75">{step.detail}</p>
                        {step.items.length > 0 && (
                          <ul className="mt-4 space-y-1.5 font-tech text-xs text-primary/75">
                            {step.items.map((it) => (
                              <li key={it} className="flex gap-2">
                                <Droplets className="mt-0.5 h-3 w-3 shrink-0 text-accent" aria-hidden="true" />
                                {it}
                              </li>
                            ))}
                          </ul>
                        )}
                      </>
                    );
                  })()}
                  {lastReport && (
                    <div className="mt-5 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => downloadReport(pool, lastReport)}
                        className="inline-flex items-center gap-2 border border-primary/25 px-4 py-2 font-tech text-[11px] uppercase tracking-wide text-primary hover:border-accent hover:text-accent"
                      >
                        <Download className="h-3.5 w-3.5" aria-hidden="true" /> Download PDF report
                      </button>
                      <button
                        type="button"
                        onClick={() => shareReport(pool, lastReport)}
                        className="inline-flex items-center gap-2 border border-primary/25 px-4 py-2 font-tech text-[11px] uppercase tracking-wide text-primary hover:border-accent hover:text-accent"
                      >
                        <Share2 className="h-3.5 w-3.5" aria-hidden="true" /> Share
                      </button>
                    </div>
                  )}
                </section>


                {/* Reading history */}
                <section className="mt-12">
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <h2 className="flex items-center gap-2 font-display text-xl uppercase tracking-tight">
                      <Waves className="h-4 w-4 text-accent" aria-hidden="true" /> Reading history
                    </h2>
                    <div className="flex gap-1.5">
                      {RANGES.map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setDays(d)}
                          aria-pressed={days === d}
                          className={`border px-3 py-1.5 font-tech text-[11px] uppercase ${
                            days === d ? "border-accent text-accent" : "border-hairline text-primary/60"
                          }`}
                        >
                          {d} days
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {CHART_METRICS.map((k) => (
                      <button
                        key={k}
                        type="button"
                        onClick={() => setMetric(k)}
                        aria-pressed={metric === k}
                        className={`border px-3 py-1.5 font-tech text-[11px] uppercase ${
                          metric === k ? "border-accent text-accent" : "border-hairline text-primary/60"
                        }`}
                      >
                        {TARGETS[k].label}
                      </button>
                    ))}
                  </div>

                  <div className="mt-4 border border-hairline p-4">
                    <p className="font-tech text-xs text-primary/60">
                      {TARGETS[metric].label} · target {TARGETS[metric].min}–{TARGETS[metric].max}
                      {TARGETS[metric].unit ? ` ${TARGETS[metric].unit}` : ""} · {TARGETS[metric].purpose}
                    </p>
                    {chartData.length < 2 ? (
                      <p className="py-10 text-center font-tech text-sm text-primary/55">
                        Not enough {TARGETS[metric].label.toLowerCase()} readings in the last {days} days to chart a
                        trend yet.
                      </p>
                    ) : (
                      <div className="mt-3 h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
                            <CartesianGrid stroke="hsl(var(--primary) / 0.08)" vertical={false} />
                            <ReferenceArea
                              y1={TARGETS[metric].min}
                              y2={TARGETS[metric].max}
                              fill="hsl(var(--accent))"
                              fillOpacity={0.08}
                            />
                            <XAxis
                              dataKey="date"
                              tick={{ fontSize: 11 }}
                              stroke="hsl(var(--primary) / 0.35)"
                              tickLine={false}
                            />
                            <YAxis
                              tick={{ fontSize: 11 }}
                              stroke="hsl(var(--primary) / 0.35)"
                              tickLine={false}
                              axisLine={false}
                              domain={["auto", "auto"]}
                            />
                            <Tooltip
                              formatter={(v: number) => [`${v} ${TARGETS[metric].unit}`.trim(), TARGETS[metric].label]}
                              contentStyle={{ fontSize: 12, borderRadius: 8 }}
                            />
                            <Line
                              type="monotone"
                              dataKey="value"
                              stroke="hsl(var(--accent))"
                              strokeWidth={2}
                              dot={{ r: 3 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>
                </section>

                {/* Chemical history */}
                <section className="mt-12">
                  <PortalChemHistory />
                </section>

                {/* Water reports */}

                <section className="mt-12">
                  <h2 className="flex items-center gap-2 font-display text-xl uppercase tracking-tight">
                    <FlaskConical className="h-4 w-4 text-accent" aria-hidden="true" /> Water reports
                  </h2>
                  <p className="mt-1 font-tech text-xs text-primary/55">
                    Every balanced-water test we run, ready to download as a branded PDF.
                  </p>
                  <div className="mt-4 divide-y divide-primary/10 border border-hairline">
                    {poolVisits.filter((v) => v.readings && v.status === "completed").length === 0 && (
                      <p className="p-5 font-tech text-sm text-primary/60">
                        Your first water report lands after the next visit.
                      </p>
                    )}
                    {poolVisits
                      .filter((v) => v.readings && v.status === "completed")
                      .slice(0, 12)
                      .map((v) => {
                        const r = (v.readings ?? {}) as Record<string, number | undefined>;
                        const summary = (["fc", "ph", "ta", "cyc"] as MetricKey[])
                          .filter((k) => typeof r[k] === "number")
                          .map((k) => `${TARGETS[k].label} ${r[k]}`)
                          .join(" · ");
                        return (
                          <div
                            key={`wr-${v.id}`}
                            className="flex flex-wrap items-center justify-between gap-3 p-4"
                          >
                            <div className="min-w-0">
                              <p className="font-tech text-sm font-semibold">
                                {new Date(v.scheduled_date).toLocaleDateString(undefined, {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })}{" "}
                                water test
                              </p>
                              <p className="font-tech text-xs text-primary/60">{summary || "Full chemistry logged"}</p>
                            </div>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => downloadReport(pool, v)}
                                className="inline-flex items-center gap-1.5 border border-primary/20 px-3 py-2 font-tech text-[10px] uppercase tracking-widest text-primary hover:border-accent hover:text-accent"
                              >
                                <Download className="h-3 w-3" aria-hidden="true" /> Download
                              </button>
                              <button
                                type="button"
                                onClick={() => shareReport(pool, v)}
                                className="inline-flex items-center gap-1.5 border border-primary/20 px-3 py-2 font-tech text-[10px] uppercase tracking-widest text-primary hover:border-accent hover:text-accent"
                              >
                                <Share2 className="h-3 w-3" aria-hidden="true" /> Share
                              </button>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </section>

                {/* Service reports */}
                <section className="mt-12">
                  <h2 className="flex items-center gap-2 font-display text-xl uppercase tracking-tight">
                    <Waves className="h-4 w-4 text-accent" aria-hidden="true" /> Service reports
                  </h2>
                  <div className="mt-4 divide-y divide-primary/10 border border-hairline">
                    {poolVisits.length === 0 && (
                      <p className="p-5 font-tech text-sm text-primary/60">No visits logged yet.</p>
                    )}
                    {poolVisits.map((v) => {
                      const photos = (v.photos ?? []).filter((p) => p?.url);
                      return (
                        <article key={v.id} className="p-5">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="font-tech text-sm font-semibold">
                              {new Date(v.scheduled_date).toLocaleDateString()}
                            </p>
                            <div className="flex items-center gap-2">
                              <span className="font-tech text-[10px] uppercase tracking-widest text-primary/55">
                                {v.status}
                              </span>
                              {v.status === "completed" && v.readings && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => downloadReport(pool, v)}
                                    className="inline-flex items-center gap-1.5 border border-primary/20 px-2.5 py-1.5 font-tech text-[10px] uppercase tracking-widest text-primary hover:border-accent hover:text-accent"
                                  >
                                    <Download className="h-3 w-3" aria-hidden="true" /> PDF
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => shareReport(pool, v)}
                                    className="inline-flex items-center gap-1.5 border border-primary/20 px-2.5 py-1.5 font-tech text-[10px] uppercase tracking-widest text-primary hover:border-accent hover:text-accent"
                                  >
                                    <Share2 className="h-3 w-3" aria-hidden="true" /> Share
                                  </button>
                                </>
                              )}
                            </div>
                          </div>

                          {v.readings && Object.keys(v.readings).length > 0 && (
                            <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 font-tech text-xs text-primary/70">
                              {Object.entries(v.readings).map(([k, val]) => (
                                <li key={k} className="flex items-center gap-1.5">
                                  <Droplets className="h-3 w-3 text-accent" aria-hidden="true" />
                                  {(TARGETS as Record<string, { label: string }>)[k]?.label ?? k}: {String(val)}
                                </li>
                              ))}
                            </ul>
                          )}
                          {v.notes && <p className="mt-3 text-sm text-primary/75">{v.notes}</p>}
                          {photos.length > 0 ? (
                            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                              {photos.map((p, i) => (
                                <figure key={`${v.id}-${i}`} className="overflow-hidden rounded-md">
                                  <img
                                    src={p.url}
                                    alt={`${p.label ?? "Visit"} photo from service on ${new Date(
                                      v.scheduled_date,
                                    ).toLocaleDateString()}`}
                                    loading="lazy"
                                    className="aspect-square w-full object-cover"
                                  />
                                  <figcaption className="mt-1 font-tech text-[10px] uppercase tracking-widest text-primary/50">
                                    {p.label ?? "Visit"}
                                  </figcaption>
                                </figure>
                              ))}
                            </div>
                          ) : (
                            v.after_photo_url && (
                              <img
                                src={v.after_photo_url}
                                alt={`Pool after service on ${new Date(v.scheduled_date).toLocaleDateString()}`}
                                loading="lazy"
                                className="mt-3 aspect-video w-full max-w-sm rounded-md object-cover"
                              />
                            )
                          )}
                        </article>
                      );
                    })}
                  </div>
                </section>

                {pool && (
                  <div className="mt-12 space-y-6">
                    <PortalAddresses
                      customerId={pool.id}
                      selectedId={serviceAddress?.id ?? null}
                      onSelect={setServiceAddress}
                    />
                    <PortalProfile />
                  </div>
                )}

                {pool && <PortalDamageReport customerId={pool.id} />}

                {pool && <PortalDocuments customerName={pool.full_name} />}


                {pool && <PortalTickets customerId={pool.id} />}

                {/* Billing */}
                <section className="mt-12">
                  <h2 className="flex items-center gap-2 font-display text-xl uppercase tracking-tight">
                    <Receipt className="h-4 w-4 text-accent" aria-hidden="true" /> Billing
                  </h2>
                  {pool && <AutopayCard pool={pool} email={user?.email ?? ""} />}

                  <div className="mt-4 divide-y divide-primary/10 border border-hairline">
                    {poolInvoices.length === 0 && (
                      <p className="p-5 font-tech text-sm text-primary/60">No invoices yet.</p>
                    )}
                    {poolInvoices.map((i) => (
                      <div key={i.id} className="flex flex-wrap items-center justify-between gap-3 p-5">
                        <div className="min-w-0">
                          <p className="font-tech text-sm font-semibold">
                            <FileText className="mr-1.5 inline h-3.5 w-3.5 text-accent" aria-hidden="true" />
                            {i.invoice_number}
                          </p>
                          <p className="font-tech text-xs text-primary/60">
                            Issued {new Date(i.issued_on).toLocaleDateString()} · {i.status}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-display text-lg">{money(i.amount)}</span>
                          {i.status === "processing" && (
                            <span className="border border-accent px-2 py-1 font-tech text-[10px] uppercase tracking-widest text-accent">
                              Processing
                            </span>
                          )}
                          {i.status !== "paid" && i.status !== "processing" && (
                            <button
                              type="button"
                              onClick={() => setPayInvoice(i)}
                              className="btn-quote rounded-md px-4 py-2 text-[11px] font-bold uppercase tracking-wide"
                            >
                              Pay now
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {pool && <PortalActivity customerId={pool.id} />}
              </>
            )}
          </>
        )}
      </main>

      {payInvoice && (
        <PortalPayDialog
          invoice={payInvoice}
          onClose={() => setPayInvoice(null)}
          onPaid={() => void refreshInvoices()}
        />
      )}

      {resched && (
        <PortalScheduleDialog
          pool={resched.pool}
          currentDate={resched.date}
          saving={saving}
          serviceAddressLine={serviceAddress ? `${serviceAddress.label} — ${formatAddress(serviceAddress)}` : null}
          onClose={() => setResched(null)}
          onSubmit={submitReschedule}
        />
      )}

    </div>
  );
}


function nextStepFor(readings: Readings | null, gallons: number) {
  if (!readings || Object.keys(readings).length === 0) {
    return {
      headline: "Awaiting first water test",
      detail: "Your next scheduled visit will log full chemistry and start your history.",
      items: [] as string[],
    };
  }
  const report = evaluate(readings, gallons || 0);
  if (report.allGood) {
    return {
      headline: "Water balanced — swim away",
      detail: "Every tested level was inside target at the last visit. No action needed from you.",
      items: [] as string[],
    };
  }
  return {
    headline: "Correction scheduled",
    detail: report.summary,
    items: report.treatments.map((t) => `${t.chemical} — ${t.amount}. ${t.reason}`),
  };
}

function visitEvent(pool: Pool, visit: Visit) {
  const match = /Preferred window:\s*([^—\n]+)/.exec(visit.notes ?? "");
  const slot = match ? VISIT_SLOTS.find((s) => s.label === match[1]?.trim()) : undefined;
  return {
    title: `Savvy Swim pool service — ${pool.service_level ?? "weekly service"}`,
    description: `Arrival window ${slot?.label ?? "8:00a – 4:00p"}. Full chemistry test, brush, skim, baskets and filter check.\nQuestions? Call or text (469) 744-0379.`,
    location: [pool.address ?? pool.full_name, pool.city].filter(Boolean).join(", "),
    date: visit.scheduled_date,
    startHour: slot?.startHour ?? 8,
    endHour: slot?.endHour ?? 16,
  };
}
