import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Lock, MapPin, Navigation, PawPrint, Send, Timer } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Chip, EmptyState, RouteRing, SectionTitle } from "@/crm/components/Brand";
import { useSavvyIdentity } from "@/crm/lib/useSavvy";
import VisitSheet from "@/crm/components/VisitSheet";
import RouteMap from "@/crm/components/RouteMap";
import { useGeofence } from "@/crm/lib/useGeofence";

export type Stop = {
  id: string;
  status: string;
  stop_order: number;
  minutes_on_site: number | null;
  completed_at: string | null;
  en_route_at: string | null;
  tech_id: string | null;
  customer_id: string;
  ss_customers: {
    id: string; full_name: string; address: string | null; city: string | null;
    phone: string | null; gallons: number; gate_code: string | null;
    internal_notes: string | null; custom_fields: Record<string, unknown>;
    pool_type: string; lat: number | null; lng: number | null;
  };
};

export default function RoutePage() {
  const id = useSavvyIdentity();
  const [view, setView] = useState<"list" | "map">("list");
  const [stops, setStops] = useState<Stop[]>([]);
  const [loading, setLoading] = useState(true);
  const [techFilter, setTechFilter] = useState<string>("all");
  const [techs, setTechs] = useState<{ id: string; full_name: string }[]>([]);
  const [activeVisit, setActiveVisit] = useState<Stop | null>(null);
  const [automations, setAutomations] = useState({ auto_on_my_way: true, auto_start_minutes: 5, geofence_feet: 600 });

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from("ss_visits")
      .select(
        "id,status,stop_order,minutes_on_site,completed_at,en_route_at,tech_id,customer_id," +
          "ss_customers(id,full_name,address,city,phone,gallons,gate_code,internal_notes,custom_fields,pool_type,lat,lng)",
      )
      .eq("scheduled_date", new Date().toISOString().slice(0, 10))
      .order("stop_order");
    if (id.isTech && id.staffId) q = q.eq("tech_id", id.staffId);
    else if (techFilter !== "all") q = q.eq("tech_id", techFilter);
    const { data } = await q;
    setStops((data ?? []) as unknown as Stop[]);
    setLoading(false);
  }, [id.isTech, id.staffId, techFilter]);

  useEffect(() => {
    if (id.loading) return;
    void load();
  }, [id.loading, load]);

  useEffect(() => {
    if (id.isTech) return;
    supabase.from("ss_staff").select("id,full_name").eq("level", "technician").eq("is_active", true)
      .then(({ data }) => setTechs(data ?? []));
  }, [id.isTech]);

  useEffect(() => {
    supabase.from("ss_settings").select("value").eq("key", "route_automations").maybeSingle()
      .then(({ data }) => data?.value && setAutomations(data.value as typeof automations));
  }, []);

  const pending = stops.filter((s) => s.status !== "completed");
  const done = stops.filter((s) => s.status === "completed");

  const sendOnMyWay = useCallback(async (stop: Stop, auto = false) => {
    await supabase.from("ss_visits").update({ status: "en_route", en_route_at: new Date().toISOString() }).eq("id", stop.id);
    await supabase.from("ss_feed").insert({
      customer_id: stop.customer_id,
      kind: "on_my_way",
      title: "Your tech is on the way 🚚",
      body: "Your Savvy Swim technician is headed your way now.",
      sent_by_sms: true,
    });
    void supabase.functions.invoke("send-sms", {
      body: {
        to: stop.ss_customers.phone,
        message: "Savvy Swim: your technician is on the way 🚚",
      },
    });
    toast.success(auto ? "Auto “On my way” sent to next stop" : "On my way sent");
    void load();
  }, [load]);

  const markArrived = useCallback(async (stop: Stop) => {
    await supabase.from("ss_visits").update({ arrived_at: new Date().toISOString() }).eq("id", stop.id);
    await supabase.from("ss_feed").insert({
      customer_id: stop.customer_id,
      kind: "arrived",
      title: "Your technician has arrived 🛠️",
      body: "Your Savvy Swim technician has arrived on site.",
      sent_by_sms: true,
    });
    void supabase.functions.invoke("send-sms", {
      body: { to: stop.ss_customers.phone, message: "Your Savvy Swim technician has arrived 🛠️" },
    });
  }, []);

  const geo = useGeofence({
    enabled: id.isTech,
    stops: pending,
    radiusFeet: automations.geofence_feet,
    dwellMinutes: automations.auto_start_minutes,
    onArrive: markArrived,
    onDwell: (stop) => {
      if (!activeVisit) setActiveVisit(stop);
    },
  });

  const navUrl = useMemo(() => {
    const addrs = pending
      .map((s) => [s.ss_customers.address, s.ss_customers.city, "TX"].filter(Boolean).join(", "))
      .filter(Boolean);
    if (!addrs.length) return null;
    const dest = encodeURIComponent(addrs[addrs.length - 1]);
    const way = addrs.slice(0, -1).map(encodeURIComponent).join("|");
    return `https://www.google.com/maps/dir/?api=1&destination=${dest}${way ? `&waypoints=${way}` : ""}&travelmode=driving`;
  }, [pending]);

  const handleComplete = useCallback(async (completedStop: Stop) => {
    setActiveVisit(null);
    await load();
    if (automations.auto_on_my_way) {
      const next = stops
        .filter((s) => s.id !== completedStop.id && s.status === "pending" && s.tech_id === completedStop.tech_id)
        .sort((a, b) => a.stop_order - b.stop_order)[0];
      if (next) void sendOnMyWay(next, true);
    }
  }, [automations.auto_on_my_way, load, sendOnMyWay, stops]);

  return (
    <div className="space-y-4">
      <div className="ss-hero flex items-center gap-4 p-4">
        <RouteRing done={done.length} total={stops.length} />
        <div className="min-w-0 flex-1">
          <div className="ss-tag" style={{ color: "rgba(255,255,255,.72)", fontSize: "0.52rem" }}>
            {new Date().toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
          </div>
          <div className="ss-num text-[1.6rem] font-bold leading-none">
            {done.length}/{stops.length}
          </div>
          <div className="mt-0.5 text-[0.78rem] opacity-80">
            stops complete{pending.length ? ` · ${pending.length} remaining` : " · route finished"}
          </div>
        </div>
        {navUrl && (
          <a href={navUrl} target="_blank" rel="noreferrer" className="ss-btn !bg-white !text-[hsl(var(--ss-burgundy))] !no-underline">
            <Navigation size={13} /> Navigate
          </a>
        )}
      </div>

      {id.isTech && (
        <div className="ss-card p-3">
          <div className="flex items-start gap-2">
            <MapPin size={15} style={{ color: "hsl(var(--ss-aqua))", marginTop: 2 }} />
            <div className="text-[0.78rem] leading-snug">
              <strong>Location automation {geo.permission === "granted" ? "ON" : "OFF"}.</strong>{" "}
              {geo.permission === "granted"
                ? `We text the customer automatically when you pull within ${automations.geofence_feet} ft, and open the visit after ${automations.auto_start_minutes} min on site.`
                : "Allow location to auto-notify customers on arrival and auto-start visits. Everything still works manually."}
              {geo.permission !== "granted" && (
                <button className="ss-btn ss-btn-aqua ml-2" onClick={geo.request}>
                  Enable location
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="ss-card flex overflow-hidden p-0.5">
          {(["list", "map"] as const).map((v) => (
            <button
              key={v}
              className="ss-btn"
              style={{
                background: view === v ? undefined : "transparent",
                color: view === v ? undefined : "hsl(var(--ss-ink) / .6)",
              }}
              onClick={() => setView(v)}
            >
              {v}
            </button>
          ))}
        </div>
        {!id.isTech && (
          <select className="ss-input max-w-[190px]" value={techFilter} onChange={(e) => setTechFilter(e.target.value)}>
            <option value="all">All technicians</option>
            {techs.map((t) => (
              <option key={t.id} value={t.id}>{t.full_name}</option>
            ))}
          </select>
        )}
      </div>

      {view === "map" ? (
        <RouteMap stops={stops} onSelect={setActiveVisit} />
      ) : loading ? (
        <EmptyState>Loading today's route…</EmptyState>
      ) : !stops.length ? (
        <EmptyState>No stops scheduled today.</EmptyState>
      ) : (
        <>
          <SectionTitle title={`Today's stops`} sub={`${pending.length} remaining`} />
          <div className="space-y-2">
            {pending.map((s) => (
              <StopCard
                key={s.id}
                stop={s}
                isTech={id.isTech}
                onOnMyWay={() => sendOnMyWay(s)}
                onStart={() => setActiveVisit(s)}
              />
            ))}
          </div>

          {!!done.length && (
            <div className="mt-6">
              <SectionTitle title="Done today" sub="Back on next week's route" />
              <div className="space-y-2 opacity-55">
                {done.map((s) => (
                  <div key={s.id} className="ss-card flex items-center gap-3 p-3">
                    <CheckCircle2 size={16} style={{ color: "hsl(var(--ss-green))" }} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[0.88rem] font-medium line-through">
                        {s.ss_customers.full_name}
                      </div>
                      <div className="truncate text-[0.72rem] opacity-70">{s.ss_customers.address}</div>
                    </div>
                    <span className="ss-num text-[0.72rem]">
                      <Timer size={11} className="mr-1 inline" />
                      {s.minutes_on_site ?? 0}m
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {activeVisit && (
        <VisitSheet
          stop={activeVisit}
          onClose={() => setActiveVisit(null)}
          onComplete={handleComplete}
        />
      )}
    </div>
  );
}

function StopCard({
  stop, isTech, onOnMyWay, onStart,
}: {
  stop: Stop; isTech: boolean; onOnMyWay: () => void; onStart: () => void;
}) {
  const c = stop.ss_customers;
  const warnings = Object.entries(c.custom_fields ?? {}).filter(([, v]) => v === true);
  return (
    <div className="ss-card p-3">
      <div className="flex items-start gap-3">
        <div
          className="ss-num flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[0.8rem] font-bold"
          style={{ background: "hsl(var(--ss-burgundy))", color: "#fff" }}
        >
          {stop.stop_order}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[0.92rem] font-semibold" style={{ color: "hsl(var(--ss-burgundy))" }}>
              {c.full_name}
            </span>
            {stop.status === "en_route" && <Chip tone="aqua">En route</Chip>}
            {c.gate_code && (
              <Chip tone="gold">
                <Lock size={9} /> Gate {c.gate_code}
              </Chip>
            )}
            {warnings.map(([k]) => (
              <Chip key={k} tone="orange">
                {k === "Dogs on property" ? <PawPrint size={9} /> : null} {k}
              </Chip>
            ))}
          </div>
          <div className="mt-0.5 text-[0.76rem] opacity-70">
            {c.address}, {c.city} · {c.pool_type} · {c.gallons.toLocaleString()} gal
          </div>
          {!isTech && c.internal_notes && (
            <div
              className="mt-2 rounded-[8px] px-2 py-1.5 text-[0.72rem]"
              style={{ background: "hsl(var(--ss-gold) / .16)", color: "hsl(35 78% 28%)" }}
            >
              <strong>STAFF NOTE</strong> · {c.internal_notes}
            </div>
          )}
          <div className="mt-2.5 flex flex-wrap gap-2">
            <button className="ss-btn ss-btn-ghost" onClick={onOnMyWay}>
              <Send size={12} /> On my way
            </button>
            <button className="ss-btn" onClick={onStart}>
              Start visit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
