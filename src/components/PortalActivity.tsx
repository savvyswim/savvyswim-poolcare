import { useEffect, useState } from "react";
import { Bell, CalendarClock, Droplets, MessageSquare, Receipt } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type FeedRow = {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  sent_by_sms: boolean | null;
  created_at: string;
};

const ICONS: Record<string, typeof Bell> = {
  payment: Receipt,
  invoice: Receipt,
  reschedule: CalendarClock,
  lock: CalendarClock,
  rain: CalendarClock,
  visit: Droplets,
  ticket: MessageSquare,
};

function when(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 60) return `${Math.max(1, mins)}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function PortalActivity({ customerId }: { customerId: string }) {
  const [rows, setRows] = useState<FeedRow[]>([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase
        .from("ss_feed")
        .select("id,kind,title,body,sent_by_sms,created_at")
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false })
        .limit(12);
      if (alive) setRows((data as unknown as FeedRow[]) ?? []);
    })();
    return () => {
      alive = false;
    };
  }, [customerId]);

  return (
    <section className="mt-12">
      <h2 className="flex items-center gap-2 font-display text-xl uppercase tracking-tight">
        <Bell className="h-4 w-4 text-accent" aria-hidden="true" /> Activity
      </h2>
      <p className="mt-1 font-tech text-xs text-primary/55">
        Everything we send you by email and text shows up here too.
      </p>

      <ol className="mt-4 divide-y divide-primary/10 border border-hairline">
        {rows.length === 0 && (
          <li className="p-5 font-tech text-sm text-primary/60">No activity yet — your next visit will start it.</li>
        )}
        {rows.map((r) => {
          const Icon = ICONS[r.kind] ?? Bell;
          return (
            <li key={r.id} className="flex gap-3 p-4">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center border border-hairline">
                <Icon className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-tech text-sm font-semibold">{r.title}</p>
                {r.body && <p className="mt-0.5 text-sm text-primary/70">{r.body}</p>}
                <p className="mt-1 flex flex-wrap items-center gap-2 font-tech text-[10px] uppercase tracking-widest text-primary/45">
                  <span>{when(r.created_at)}</span>
                  <span className="border border-hairline px-1.5 py-0.5">Email sent</span>
                  {r.sent_by_sms && <span className="border border-hairline px-1.5 py-0.5">Text sent</span>}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
