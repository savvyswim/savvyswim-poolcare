import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type EventRow = {
  id: string;
  event_type: string;
  channel: string | null;
  recipient: string | null;
  outcome: string | null;
  detail: string | null;
  status_to: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  landing_page: string | null;
  campaign_id: string | null;
  created_at: string;
};

const stamp = (iso: string) =>
  new Date(iso).toLocaleString("en-US", {
    timeZone: "America/Chicago",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

const LABEL: Record<string, string> = {
  status_change: "Status",
  email_sent: "Email sent",
  email_failed: "Email failed",
  sms_sent: "Text sent",
  sms_failed: "Text failed",
  converted: "Converted",
};

const failed = (t: string) => t.endsWith("_failed");

export default function InspectionTimeline({ requestId }: { requestId: string }) {
  const [rows, setRows] = useState<EventRow[] | null>(null);

  useEffect(() => {
    let alive = true;
    void supabase
      .from("inspection_events")
      .select(
        "id, event_type, channel, recipient, outcome, detail, status_to, utm_source, utm_medium, utm_campaign, landing_page, campaign_id, created_at",
      )
      .eq("request_id", requestId)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (alive) setRows((data ?? []) as EventRow[]);
      });
    return () => {
      alive = false;
    };
  }, [requestId]);

  if (rows === null) return <div className="p-3 text-[0.78rem] opacity-60">Loading timeline…</div>;
  if (rows.length === 0)
    return (
      <div className="p-3 text-[0.78rem] opacity-60">
        No tracked activity yet for this request.
      </div>
    );

  const attribution =
    [rows[0]?.utm_source, rows[0]?.utm_medium, rows[0]?.utm_campaign].filter(Boolean).join(" · ") ||
    "Direct";

  return (
    <div className="space-y-2 p-3">
      <div className="text-[0.72rem] uppercase tracking-wide opacity-60">
        Attributed to {attribution}
        {rows[0]?.landing_page ? ` · landed ${rows[0].landing_page}` : ""}
        {rows[0]?.campaign_id ? ` · ${rows[0].campaign_id}` : ""}
      </div>
      <ol className="space-y-1">
        {rows.map((e) => (
          <li key={e.id} className="flex flex-wrap gap-x-2 text-[0.78rem]">
            <span className="w-32 shrink-0 opacity-60">{stamp(e.created_at)}</span>
            <span
              className="font-semibold"
              style={{ color: failed(e.event_type) ? "#8E1F2C" : "#1FA9BE" }}
            >
              {LABEL[e.event_type] ?? e.event_type}
              {e.status_to ? ` → ${e.status_to}` : ""}
            </span>
            <span className="opacity-75">
              {[e.detail, e.recipient].filter(Boolean).join(" · ")}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
