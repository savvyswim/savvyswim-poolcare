import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SectionTitle } from "@/crm/components/Brand";
import InspectionSourceAnalytics, {
  RANGES,
  inRange,
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
  pool_details: string | null;
  notes: string | null;
  status: string;
  utm_source: string | null;
  utm_campaign: string | null;
  created_at: string;
};

const STATUSES = ["new", "contacted", "scheduled", "won", "lost"] as const;

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
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [q, setQ] = useState("");

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("inspection_requests")
      .select(
        "id, reference_number, full_name, email, phone, address, postal_code, preferred_date, preferred_contact_time, pool_details, notes, status, utm_source, utm_campaign, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(300);
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setRows((data ?? []) as Row[]);
  }

  useEffect(() => {
    void load();
  }, []);

  async function setStatus(id: string, status: string) {
    const { error } = await supabase.from("inspection_requests").update({ status }).eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setRows((r) => r.map((x) => (x.id === id ? { ...x, status } : x)));
  }

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (filter === "all" || r.status === filter) &&
        inRange(r.created_at, range) &&
        (!source || sourceOf(r) === source) &&
        (!needle ||
          [r.full_name, r.phone, r.address, r.email, r.reference_number]
            .join(" ")
            .toLowerCase()
            .includes(needle)),
    );
  }, [rows, filter, q, range, source]);

  const inWindow = useMemo(
    () => rows.filter((r) => inRange(r.created_at, range) && (!source || sourceOf(r) === source)),
    [rows, range, source],
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

      {(source || range !== "90" || filter !== "all") && (
        <div className="ss-card flex flex-wrap items-center gap-2 p-3 text-[0.8rem]">
          <span className="opacity-60">Showing:</span>
          <span>{RANGES.find((r) => r.key === range)?.label}</span>
          {source && <span>· source “{source}”</span>}
          {filter !== "all" && <span>· status {filter}</span>}
          <button
            className="ss-btn ml-auto"
            onClick={() => {
              setSource(null);
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
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.id} className="border-t border-black/10 align-top">
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
                    <div className="opacity-60">{r.preferred_contact_time ?? ""}</div>
                  </td>
                  <td className="p-3 opacity-75">
                    {[r.utm_source, r.utm_campaign].filter(Boolean).join(" · ") || "Direct"}
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
