import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Chip } from "@/crm/components/Brand";
import { useAuth } from "@/hooks/useAuth";

type Finding = {
  id: string;
  internal_id: string;
  scanner: string;
  title: string;
  severity: string;
  status: string;
  description: string | null;
  remediation: string | null;
  approved_by_email: string | null;
  approved_at: string | null;
  resolved_at: string | null;
  updated_at: string;
};

type CheckRun = {
  id: string;
  check_key: string;
  passed: boolean;
  summary: string;
  details: { rules?: { rule: string; passed: boolean; detail: string }[] } | null;
  triggered_by: string;
  created_at: string;
};

const STATUSES = ["open", "in_progress", "fixed", "ignored", "monitoring"] as const;

const statusTone = (s: string) =>
  s === "fixed" ? "aqua" : s === "ignored" || s === "monitoring" ? "ink" : "burgundy";

const when = (v: string | null) =>
  v ? new Date(v).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }) : "—";

export default function Security() {
  const { user } = useAuth();
  const [findings, setFindings] = useState<Finding[]>([]);
  const [runs, setRuns] = useState<CheckRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  const load = useCallback(async () => {
    const [{ data: f }, { data: r }] = await Promise.all([
      supabase.from("security_findings").select("*").order("status").order("updated_at", { ascending: false }),
      supabase.from("security_check_runs").select("*").order("created_at", { ascending: false }).limit(20),
    ]);
    setFindings((f ?? []) as Finding[]);
    setRuns((r ?? []) as unknown as CheckRun[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const latest = runs[0] ?? null;
  const open = useMemo(() => findings.filter((f) => f.status === "open" || f.status === "in_progress"), [findings]);

  async function runCheck() {
    setRunning(true);
    const { data, error } = await supabase.functions.invoke("security-audit", { body: {} });
    setRunning(false);
    if (error) {
      toast.error("Permission check failed to run");
      return;
    }
    const res = data as { passed: boolean; summary: string };
    res.passed ? toast.success(res.summary) : toast.error(res.summary);
    void load();
  }

  async function patch(f: Finding, changes: Partial<Finding>) {
    const next = { ...changes } as Record<string, unknown>;
    if (changes.status && ["fixed", "ignored"].includes(changes.status)) {
      next.approved_by_email = user?.email ?? null;
      next.approved_at = new Date().toISOString();
      next.resolved_at = new Date().toISOString();
    }
    setFindings((s) => s.map((x) => (x.id === f.id ? { ...x, ...(next as Partial<Finding>) } : x)));
    const { error } = await supabase.from("security_findings").update(next).eq("id", f.id);
    if (error) toast.error(error.message);
    else void load();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="ss-tag">Internal · restricted</div>
          <h1 className="text-[1.4rem] leading-tight">Security register</h1>
          <p className="text-[0.82rem] opacity-65">
            Every scanner finding, its ID, remediation status and who signed off on the fix.
          </p>
        </div>
        <button className="ss-btn" onClick={runCheck} disabled={running}>
          {running ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          Run permission check
        </button>
      </div>

      {/* Automated storage permission check */}
      <div className="ss-card p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="ss-tag" style={{ fontSize: "0.55rem" }}>
              Automated check · service photo permissions
            </div>
            <p className="mt-1 text-[0.88rem] font-semibold">
              {latest ? latest.summary : "No run recorded yet — run the check to establish a baseline."}
            </p>
            <p className="text-[0.74rem] opacity-60">
              {latest ? `${when(latest.created_at)} · triggered by ${latest.triggered_by}` : "Runs daily and on demand."}
            </p>
          </div>
          {latest &&
            (latest.passed ? (
              <CheckCircle2 size={22} style={{ color: "hsl(152 55% 34%)" }} />
            ) : (
              <AlertTriangle size={22} style={{ color: "hsl(var(--ss-burgundy))" }} />
            ))}
        </div>

        {!!latest?.details?.rules?.length && (
          <div className="mt-3 space-y-1.5 border-t pt-3" style={{ borderColor: "hsl(var(--ss-sand))" }}>
            {latest.details.rules.map((r) => (
              <div key={r.rule} className="flex items-start gap-2 text-[0.78rem]">
                {r.passed ? (
                  <ShieldCheck size={14} className="mt-0.5 shrink-0" style={{ color: "hsl(152 55% 34%)" }} />
                ) : (
                  <AlertTriangle size={14} className="mt-0.5 shrink-0" style={{ color: "hsl(var(--ss-burgundy))" }} />
                )}
                <span>
                  <strong>{r.rule.replace(/_/g, " ")}</strong>
                  <span className="block opacity-65">{r.detail}</span>
                </span>
              </div>
            ))}
          </div>
        )}

        {runs.length > 1 && (
          <details className="mt-3 text-[0.76rem]">
            <summary className="cursor-pointer opacity-70">Run history ({runs.length})</summary>
            <div className="mt-2 space-y-1">
              {runs.map((r) => (
                <div key={r.id} className="flex justify-between gap-3 opacity-75">
                  <span>
                    {r.passed ? "PASS" : "FAIL"} · {r.triggered_by}
                  </span>
                  <span className="ss-num">{when(r.created_at)}</span>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>

      {/* Findings register */}
      {loading && <Loader2 className="animate-spin" size={18} />}
      {!loading && !findings.length && (
        <p className="text-[0.85rem] opacity-60">No findings recorded yet.</p>
      )}

      {!!open.length && (
        <div className="ss-card p-3 text-[0.8rem]" style={{ borderColor: "hsl(var(--ss-orange) / .45)" }}>
          <AlertTriangle size={13} className="mr-1 inline" style={{ color: "hsl(var(--ss-orange))" }} />
          {open.length} finding{open.length > 1 ? "s" : ""} still awaiting remediation.
        </div>
      )}

      {findings.map((f) => (
        <div key={f.id} className="ss-card p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <Chip tone={statusTone(f.status)}>{f.status.replace("_", " ")}</Chip>
                <Chip tone="ink">{f.severity}</Chip>
                <Chip tone="ink">{f.scanner}</Chip>
              </div>
              <h2 className="mt-1.5 text-[0.95rem] leading-tight">{f.title}</h2>
              <code className="text-[0.7rem] opacity-60">{f.internal_id}</code>
            </div>
            <select
              className="ss-input w-auto"
              value={f.status}
              onChange={(e) => void patch(f, { status: e.target.value })}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.replace("_", " ")}
                </option>
              ))}
            </select>
          </div>

          {f.description && <p className="mt-2 text-[0.8rem] opacity-75">{f.description}</p>}

          <div className="mt-2">
            <label className="ss-label">Remediation</label>
            <textarea
              className="ss-input"
              rows={2}
              defaultValue={f.remediation ?? ""}
              onBlur={(e) => {
                if (e.target.value !== (f.remediation ?? "")) void patch(f, { remediation: e.target.value });
              }}
            />
          </div>

          <div
            className="mt-2 flex flex-wrap gap-x-5 gap-y-1 border-t pt-2 text-[0.74rem] opacity-70"
            style={{ borderColor: "hsl(var(--ss-sand))" }}
          >
            <span>Approved by: <strong>{f.approved_by_email ?? "— not signed off"}</strong></span>
            <span>Approved: {when(f.approved_at)}</span>
            <span>Last updated: {when(f.updated_at)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
