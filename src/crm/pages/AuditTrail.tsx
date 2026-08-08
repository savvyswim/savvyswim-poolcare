import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw, ScrollText, ShieldAlert, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Chip } from "@/crm/components/Brand";

type AuditRow = {
  id: string;
  action: string;
  actor_kind: string;
  actor_label: string | null;
  actor_user_id: string | null;
  actor_staff_id: string | null;
  subject_table: string | null;
  subject_id: string | null;
  success: boolean;
  outcome: string | null;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
};

const FILTERS = [
  { key: "all", label: "All activity" },
  { key: "service_report", label: "Service reports" },
  { key: "twilio_status_webhook", label: "SMS webhook" },
  { key: "stripe_webhook", label: "Payment webhook" },
  { key: "denied", label: "Denied / failed" },
] as const;

const when = (v: string) =>
  new Date(v).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

export default function AuditTrail() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["key"]>("all");

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("ss_security_audit")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    setRows((data ?? []) as unknown as AuditRow[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(() => {
    if (filter === "all") return rows;
    if (filter === "denied") return rows.filter((r) => !r.success);
    return rows.filter((r) => r.action.startsWith(filter));
  }, [rows, filter]);

  const failures = rows.filter((r) => !r.success).length;

  // Twilio callback-token verification metrics
  const twilio = useMemo(() => {
    const since = (h: number) => Date.now() - h * 3600_000;
    const all = rows.filter((r) => r.action.startsWith("twilio_status_webhook"));
    const rejected = all.filter((r) => r.action.endsWith(".rejected"));
    const accepted = all.filter((r) => !r.action.endsWith(".rejected"));
    const within = (list: AuditRow[], h: number) =>
      list.filter((r) => new Date(r.created_at).getTime() >= since(h)).length;

    const reasons = new Map<string, number>();
    for (const r of rejected) {
      const reason = String((r.details as { reason?: string } | null)?.reason ?? "unknown");
      reasons.set(reason, (reasons.get(reason) ?? 0) + 1);
    }
    const ips = new Map<string, number>();
    for (const r of rejected) {
      if (!r.ip_address) continue;
      ips.set(r.ip_address, (ips.get(r.ip_address) ?? 0) + 1);
    }
    const rate = all.length ? Math.round((rejected.length / all.length) * 100) : 0;

    return {
      total: all.length,
      rejected: rejected.length,
      accepted: accepted.length,
      rejected24h: within(rejected, 24),
      rejected7d: within(rejected, 24 * 7),
      rate,
      lastRejection: rejected[0]?.created_at ?? null,
      reasons: [...reasons.entries()].sort((a, b) => b[1] - a[1]),
      ips: [...ips.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5),
    };
  }, [rows]);


  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl uppercase tracking-tight">Audit Trail</h1>
          <p className="text-sm text-muted-foreground">
            Who generated service reports and what our webhooks triggered. Append-only — nothing here can be edited.
          </p>
        </div>
        <button
          onClick={() => void load()}
          className="inline-flex items-center gap-2 border border-foreground/20 px-3 py-2 text-xs uppercase tracking-widest"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="border border-foreground/15 p-4">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Events logged</div>
          <div className="font-display text-3xl">{rows.length}</div>
        </div>
        <div className="border border-foreground/15 p-4">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Denied / failed</div>
          <div className="font-display text-3xl">{failures}</div>
        </div>
        <div className="border border-foreground/15 p-4">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Most recent</div>
          <div className="font-display text-xl">{rows[0] ? when(rows[0].created_at) : "—"}</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`border px-3 py-1.5 text-xs uppercase tracking-widest ${
              filter === f.key ? "border-foreground bg-foreground text-background" : "border-foreground/20"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 p-8 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading audit trail…
        </div>
      ) : visible.length === 0 ? (
        <div className="flex items-center gap-2 border border-dashed border-foreground/20 p-8 text-sm text-muted-foreground">
          <ScrollText className="h-4 w-4" /> No events recorded yet for this filter.
        </div>
      ) : (
        <div className="divide-y divide-foreground/10 border border-foreground/15">
          {visible.map((r) => (
            <div key={r.id} className="flex flex-wrap items-start gap-3 p-4">
              <div className="mt-0.5">
                {r.success ? (
                  <ShieldCheck className="h-4 w-4 text-[hsl(var(--aqua,190_70%_43%))]" />
                ) : (
                  <ShieldAlert className="h-4 w-4 text-destructive" />
                )}
              </div>
              <div className="min-w-[220px] flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-sm">{r.action}</span>
                  <Chip tone={r.success ? "aqua" : "burgundy"}>{r.success ? "ok" : "blocked"}</Chip>
                  <Chip tone="ink">{r.actor_kind}</Chip>
                </div>
                <div className="mt-1 text-sm text-muted-foreground">{r.outcome ?? "—"}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {r.actor_label ? `${r.actor_label} · ` : ""}
                  {r.subject_table ? `${r.subject_table} ${r.subject_id ?? ""}` : ""}
                  {r.ip_address ? ` · ${r.ip_address}` : ""}
                </div>
              </div>
              <div className="text-xs uppercase tracking-widest text-muted-foreground">{when(r.created_at)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
