import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { EmptyState } from "@/crm/components/Brand";

type FeedRow = {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  created_at: string;
};

const TONE: Record<string, string> = {
  convert: "var(--ss-burgundy)",
  job: "var(--ss-aqua)",
  update: "var(--ss-sand)",
};

export default function ActivityLog({ customerId }: { customerId: string }) {
  const [rows, setRows] = useState<FeedRow[] | null>(null);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const { data } = await supabase
        .from("ss_feed")
        .select("id,kind,title,body,created_at")
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false })
        .limit(100);
      if (alive) setRows((data ?? []) as FeedRow[]);
    })();
    return () => {
      alive = false;
    };
  }, [customerId]);

  if (rows === null) return <EmptyState>Loading activity…</EmptyState>;
  if (!rows.length) return <EmptyState>No activity recorded yet.</EmptyState>;

  return (
    <ol className="space-y-2">
      {rows.map((r) => (
        <li key={r.id} className="ss-card flex gap-2.5 p-3">
          <span
            className="mt-[7px] h-2 w-2 shrink-0 rounded-full"
            style={{ background: `hsl(${TONE[r.kind] ?? "var(--ss-sand)"})` }}
          />
          <div className="min-w-0">
            <div className="text-[0.84rem] font-semibold">{r.title}</div>
            {r.body && <div className="text-[0.76rem] opacity-75">{r.body}</div>}
            <div className="ss-num text-[0.68rem] opacity-55">
              {new Date(r.created_at).toLocaleString()}
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
