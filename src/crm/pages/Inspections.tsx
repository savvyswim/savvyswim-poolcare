import { Fragment, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { SectionTitle } from "@/crm/components/Brand";
import { convertInspectionToCustomer } from "@/lib/inspection-convert.functions";
import {
  logInspectionStatusChange,
  notifyInspectionStatus,
} from "@/lib/inspection-status-notify.functions";
import InspectionTimeline from "@/crm/components/InspectionTimeline";
import InspectionSourceAnalytics, {
  RANGES,
  inRange,
  pageOf,
  sourceOf,
} from "@/crm/components/InspectionSourceAnalytics";


type Row = {
  id: string;
  reference_number: string;
  full_name: string;
  email: string;
  phone: string;
  address: string;
  postal_code: string;
  preferred_date: string | null;
  preferred_contact_time: string | null;
  preferred_slot: string | null;
  pool_details: string | null;
  notes: string | null;
  status: string;
  converted_customer_id: string | null;
  campaign_id: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  landing_page: string | null;
  page_path: string | null;
  referrer: string | null;
  session_id: string | null;
  created_at: string;
};

type Touch = { calls: number; texts: number; first: string | null };

const STATUSES = ["new", "contacted", "scheduled", "completed", "won", "lost"] as const;

const host = (url: string | null) => {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};



const when = (iso: string) =>
  new Date(iso).toLocaleString("en-US", {
    timeZone: "America/Chicago",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

export default function Inspections() {
  const [rows, setRows] = useState<Row[]>([]);
  const [touches, setTouches] = useState<Record<string, Touch>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [q, setQ] = useState("");
  const [range, setRange] = useState<string>("90");
  const [source, setSource] = useState<string | null>(null);
  const [landing, setLanding] = useState<string | null>(null);
  const [converting, setConverting] = useState<string | null>(null);
  const [openTimeline, setOpenTimeline] = useState<string | null>(null);
  const navigate = useNavigate();

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("inspection_requests")
      .select(
        "id, reference_number, full_name, email, phone, address, postal_code, preferred_date, preferred_contact_time, preferred_slot, pool_details, notes, status, converted_customer_id, campaign_id, utm_source, utm_medium, utm_campaign, utm_content, landing_page, page_path, referrer, session_id, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(300);
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    const list = (data ?? []) as Row[];
    setRows(list);

    // Call / text clicks made from the same browser session as the form fill.
    const sessions = [...new Set(list.map((r) => r.session_id).filter(Boolean))] as string[];
    if (sessions.length) {
      const { data: events } = await supabase
        .from("contact_events")
        .select("session_id, event_type, created_at")
        .in("session_id", sessions.slice(0, 200));
      const map: Record<string, Touch> = {};
      for (const e of events ?? []) {
        const key = e.session_id as string;
        const cur = map[key] ?? { calls: 0, texts: 0, first: null };
        if (e.event_type === "call_click") cur.calls += 1;
        if (e.event_type === "text_click") cur.texts += 1;
        if (!cur.first || e.created_at < cur.first) cur.first = e.created_at;
        map[key] = cur;
      }
      setTouches(map);
    }
  }


  useEffect(() => {
    void load();
  }, []);

  async function setStatus(id: string, status: string) {
    const previous = rows.find((r) => r.id === id)?.status ?? null;
    const { error } = await supabase.from("inspection_requests").update({ status }).eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setRows((r) => r.map((x) => (x.id === id ? { ...x, status } : x)));

    if (status !== "scheduled" && status !== "completed") {
      void logInspectionStatusChange({
        data: { requestId: id, statusFrom: previous, statusTo: status },
      }).catch((e) => console.warn("status not logged", e));
    }

    if (status === "scheduled" || status === "completed") {
      void notifyInspectionStatus({ data: { requestId: id, status } })
        .then(() => toast.success(`Alert sent — inspection ${status}`))
        .catch((e) => {
          console.warn("status alert failed", e);
          toast.error("Status saved, but the alert could not be sent");
        });
    }
  }

  async function convert(row: Row) {
    if (row.converted_customer_id) {
      void navigate({
        to: "/admin/crm/customers/$id",
        params: { id: row.converted_customer_id },
      });
      return;
    }
    setConverting(row.id);
    try {
      const res = await convertInspectionToCustomer({ data: { requestId: row.id } });
      setRows((r) =>
        r.map((x) =>
          x.id === row.id ? { ...x, converted_customer_id: res.customerId, status: "won" } : x,
        ),
      );
      toast.success("Converted — you can build the estimate now");
      void navigate({ to: "/admin/crm/customers/$id", params: { id: res.customerId } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not convert this request");
    } finally {
      setConverting(null);
    }
  }


  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (filter === "all" || r.status === filter) &&
        inRange(r.created_at, range) &&
        (!source || sourceOf(r) === source) &&
        (!landing || pageOf(r) === landing) &&
        (!needle ||
          [r.full_name, r.phone, r.address, r.email, r.reference_number]
            .join(" ")
            .toLowerCase()
            .includes(needle)),
    );
  }, [rows, filter, q, range, source, landing]);

  const inWindow = useMemo(
    () =>
      rows.filter(
        (r) =>
          inRange(r.created_at, range) &&
          (!source || sourceOf(r) === source) &&
          (!landing || pageOf(r) === landing),
      ),
    [rows, range, source, landing],
  );

  const newCount = rows.filter((r) => r.status === "new").length;

  return (
    <div className="space-y-4">
      <SectionTitle
        title="Inspection Requests"
        sub={`${rows.length} total · ${newCount} awaiting first contact`}
      />

      <InspectionSourceAnalytics
        rows={rows}
        range={range}
        onRangeChange={setRange}
        activeSource={source}
        onSelectSource={setSource}
        activeLanding={landing}
        onSelectLanding={setLanding}
      />


      <div className="ss-card flex flex-wrap items-center gap-2 p-3">
        <input
          className="ss-input max-w-xs"
          placeholder="Search name, phone or address"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        {["all", ...STATUSES].map((s) => (
          <button
            key={s}
            className="ss-btn"
            style={filter === s ? undefined : { opacity: 0.55 }}
            onClick={() => setFilter(s)}
          >
            {s === "all"
              ? `All (${inWindow.length})`
              : `${s} (${inWindow.filter((r) => r.status === s).length})`}
          </button>
        ))}
        <button className="ss-btn ml-auto" onClick={() => void load()}>
          Refresh
        </button>
      </div>

      {(source || landing || range !== "90" || filter !== "all") && (
        <div className="ss-card flex flex-wrap items-center gap-2 p-3 text-[0.8rem]">
          <span className="opacity-60">Showing:</span>
          <span>{RANGES.find((r) => r.key === range)?.label}</span>
          {source && <span>· source “{source}”</span>}
          {landing && <span>· landing page “{landing}”</span>}
          {filter !== "all" && <span>· status {filter}</span>}
          <button
            className="ss-btn ml-auto"
            onClick={() => {
              setSource(null);
              setLanding(null);
              setFilter("all");
              setRange("90");
            }}
          >

            Clear filters
          </button>
        </div>
      )}


      {loading ? (
        <div className="ss-card p-4 text-[0.85rem] opacity-70">Loading requests…</div>
      ) : shown.length === 0 ? (
        <div className="ss-card p-4 text-[0.85rem] opacity-70">No inspection requests yet.</div>
      ) : (
        <div className="ss-card overflow-x-auto p-0">
          <table className="w-full text-left text-[0.85rem]">
            <thead>
              <tr className="ss-label">
                <th className="p-3">Submitted</th>
                <th className="p-3">Name</th>
                <th className="p-3">Phone</th>
                <th className="p-3">Address</th>
                <th className="p-3">Preferred</th>
                <th className="p-3">Source</th>
                <th className="p-3">Status</th>
                <th className="p-3">CRM</th>
              </tr>

            </thead>
            <tbody>
              {shown.map((r) => (
                <Fragment key={r.id}>
                <tr className="border-t border-black/10 align-top">
                  <td className="whitespace-nowrap p-3">
                    {when(r.created_at)}
                    <div className="opacity-60">{r.reference_number}</div>
                  </td>
                  <td className="p-3">
                    {r.full_name}
                    <div className="opacity-60">
                      <a href={`mailto:${r.email}`}>{r.email}</a>
                    </div>
                  </td>
                  <td className="whitespace-nowrap p-3">
                    <a href={`tel:${r.phone.replace(/[^\d+]/g, "")}`}>{r.phone}</a>
                  </td>
                  <td className="p-3">
                    {r.address}
                    <div className="opacity-60">{r.postal_code}</div>
                  </td>
                  <td className="p-3">
                    {r.preferred_date ?? "—"}
                    <div className="opacity-60">
                      {r.preferred_slot ?? r.preferred_contact_time ?? ""}
                    </div>
                  </td>
                  <td className="p-3 opacity-75">
                    <div className="font-semibold">
                      {[r.utm_source, r.utm_campaign].filter(Boolean).join(" · ") || "Direct"}
                    </div>
                    <div className="text-[0.75rem] opacity-70">
                      {[r.utm_medium, r.utm_content].filter(Boolean).join(" · ") || "no medium"}
                    </div>
                    <div className="text-[0.75rem] opacity-70">Landed: {pageOf(r)}</div>
                    {host(r.referrer) && (
                      <div className="text-[0.75rem] opacity-70">Ref: {host(r.referrer)}</div>
                    )}
                    {r.campaign_id && (
                      <div className="text-[0.7rem] opacity-50">{r.campaign_id}</div>
                    )}
                    {(() => {
                      const t = r.session_id ? touches[r.session_id] : undefined;
                      if (!t || (!t.calls && !t.texts)) return null;
                      return (
                        <div className="mt-1 text-[0.72rem]" style={{ color: "#1FA9BE" }}>
                          Also {t.calls ? `${t.calls} call tap` : ""}
                          {t.calls && t.texts ? " · " : ""}
                          {t.texts ? `${t.texts} text tap` : ""} before the form
                        </div>
                      );
                    })()}
                  </td>

                  <td className="p-3">
                    <select
                      className="ss-input"
                      value={r.status}
                      onChange={(e) => void setStatus(r.id, e.target.value)}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="whitespace-nowrap p-3">
                    <button
                      type="button"
                      className="ss-btn"
                      disabled={converting === r.id}
                      onClick={() => void convert(r)}
                    >
                      {r.converted_customer_id
                        ? "Open customer"
                        : converting === r.id
                          ? "Converting…"
                          : "Convert → estimate"}
                    </button>
                    <button
                      type="button"
                      className="ss-btn mt-1 block"
                      onClick={() => setOpenTimeline(openTimeline === r.id ? null : r.id)}
                    >
                      {openTimeline === r.id ? "Hide tracking" : "Tracking"}
                    </button>
                  </td>
                </tr>
                {openTimeline === r.id && (
                  <tr className="border-t border-black/10">
                    <td colSpan={8} className="bg-black/[0.03] p-0">
                      <InspectionTimeline requestId={r.id} />
                    </td>
                  </tr>
                )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
