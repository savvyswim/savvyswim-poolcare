import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, KeyRound, Loader2, Mail, Plus, RotateCw, ShieldCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { Chip } from "@/crm/components/Brand";
import {
  listTestAccounts,
  removeTestAccount,
  rotateTestCredential,
  selfCheckTestAccounts,
  upsertTestAccount,
} from "@/lib/test-credentials.functions";

type CheckResult = {
  id: string;
  label: string;
  email: string;
  role: string;
  ok: boolean;
  summary: string;
  last_sign_in_at: string | null;
  checks: { check: string; passed: boolean; detail: string }[];
};

type CheckReport = {
  environment: string;
  checked_at: string;
  passed: boolean;
  results: CheckResult[];
};

type Row = {
  id: string;
  label: string;
  email: string;
  role: string;
  environment: string;
  notes: string | null;
  last_rotated_at: string | null;
  rotation_count: number;
};

const when = (v: string | null) =>
  v
    ? new Date(v).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "never";

const blank = {
  label: "",
  email: "",
  role: "customer" as const,
  environment: "preview" as const,
  notes: "",
};

/**
 * Owner-only console for QA logins. Passwords are minted server-side, shown
 * once here, and never stored in the database, the repo, or the audit trail.
 */
export default function TestCredentials() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<typeof blank>(blank);
  const [reveal, setReveal] = useState<{ email: string; password: string } | null>(null);
  const [checking, setChecking] = useState(false);
  const [report, setReport] = useState<CheckReport | null>(null);

  const list = useServerFn(listTestAccounts);
  const rotate = useServerFn(rotateTestCredential);
  const upsert = useServerFn(upsertTestAccount);
  const remove = useServerFn(removeTestAccount);
  const selfCheck = useServerFn(selfCheckTestAccounts);

  async function runSelfCheck() {
    setChecking(true);
    try {
      const res = (await selfCheck({
        data: { origin: window.location.origin },
      })) as CheckReport;
      setReport(res);
      res.passed
        ? toast.success(`All ${res.results.length} ${res.environment} logins are usable`)
        : toast.error(`${res.results.filter((r) => !r.ok).length} login(s) need attention`);
    } catch (e) {
      toast.error((e as Error).message);
    }
    setChecking(false);
  }

  const load = useCallback(async () => {
    try {
      const data = (await list({})) as Row[];
      setRows(data);
    } catch (e) {
      toast.error((e as Error).message);
    }
    setLoading(false);
  }, [list]);

  useEffect(() => {
    void load();
  }, [load]);

  async function doRotate(row: Row, mode: "reveal" | "link") {
    setBusy(row.id);
    setReveal(null);
    try {
      const res = (await rotate({
        data: { id: row.id, mode, origin: window.location.origin },
      })) as { email: string; password: string | null; action_link: string | null };
      if (mode === "reveal" && res.password) {
        setReveal({ email: res.email, password: res.password });
        toast.success("New password issued — copy it now, it won't be shown again");
      } else {
        toast.success(`Recovery link sent to ${res.email}`);
      }
      void load();
    } catch (e) {
      toast.error((e as Error).message);
    }
    setBusy(null);
  }

  async function save() {
    try {
      await upsert({ data: { ...draft, notes: draft.notes || undefined } });
      setDraft(blank);
      setAdding(false);
      void load();
      toast.success("Test account registered");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <div className="ss-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="ss-tag" style={{ fontSize: "0.55rem" }}>
            Owner only · QA credential rotation
          </div>
          <p className="mt-1 text-[0.88rem] font-semibold">Test &amp; demo logins</p>
          <p className="text-[0.74rem] opacity-65">
            Rotate a QA password per environment. Secrets are generated on the server, shown once,
            and never written to the database, the code, or the audit log.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <button className="ss-btn" onClick={() => void runSelfCheck()} disabled={checking}>
            {checking ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
            Run self-check
          </button>
          <button className="ss-btn" onClick={() => setAdding((v) => !v)}>
            <Plus size={14} /> Register account
          </button>
        </div>
      </div>

      {adding && (
        <div className="mt-3 grid gap-2 border-t pt-3 sm:grid-cols-2" style={{ borderColor: "hsl(var(--ss-sand))" }}>
          <input
            className="ss-input"
            placeholder="Label (e.g. Test technician)"
            value={draft.label}
            onChange={(e) => setDraft({ ...draft, label: e.target.value })}
          />
          <input
            className="ss-input"
            placeholder="email@savvyswim.com"
            value={draft.email}
            onChange={(e) => setDraft({ ...draft, email: e.target.value })}
          />
          <select
            className="ss-input"
            value={draft.role}
            onChange={(e) => setDraft({ ...draft, role: e.target.value as typeof draft.role })}
          >
            {["owner", "office", "tech", "customer"].map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <select
            className="ss-input"
            value={draft.environment}
            onChange={(e) =>
              setDraft({ ...draft, environment: e.target.value as typeof draft.environment })
            }
          >
            <option value="preview">preview</option>
            <option value="production">production</option>
          </select>
          <input
            className="ss-input sm:col-span-2"
            placeholder="Notes (optional)"
            value={draft.notes}
            onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
          />
          <button className="ss-btn sm:col-span-2" onClick={() => void save()}>
            Save
          </button>
        </div>
      )}

      {reveal && (
        <div
          className="mt-3 border p-3 text-[0.82rem]"
          style={{ borderColor: "hsl(var(--ss-aqua))" }}
        >
          <div className="ss-tag" style={{ fontSize: "0.55rem" }}>
            One-time reveal · {reveal.email}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <code className="ss-num break-all text-[0.95rem] font-semibold">{reveal.password}</code>
            <button
              className="ss-btn"
              onClick={() => {
                void navigator.clipboard.writeText(reveal.password);
                toast.success("Copied");
              }}
            >
              Copy
            </button>
            <button className="ss-btn" onClick={() => setReveal(null)}>
              Hide
            </button>
          </div>
          <p className="mt-1 opacity-65">
            Share it through your password manager — never paste it into chat, tickets or the repo.
          </p>
        </div>
      )}

      {report && (
        <div className="mt-3 border-t pt-3" style={{ borderColor: "hsl(var(--ss-sand))" }}>
          <div className="ss-tag" style={{ fontSize: "0.55rem" }}>
            Self-check · {report.environment} · {when(report.checked_at)}
          </div>
          <div className="mt-2 space-y-2">
            {!report.results.length && (
              <p className="text-[0.8rem] opacity-60">
                No accounts registered for this environment.
              </p>
            )}
            {report.results.map((r) => (
              <div key={r.id} className="text-[0.8rem]">
                <div className="flex items-start gap-2">
                  {r.ok ? (
                    <CheckCircle2 size={14} className="mt-0.5 shrink-0" style={{ color: "hsl(152 55% 34%)" }} />
                  ) : (
                    <AlertTriangle size={14} className="mt-0.5 shrink-0" style={{ color: "hsl(var(--ss-burgundy))" }} />
                  )}
                  <span>
                    <strong>{r.label}</strong> <span className="opacity-65">({r.role})</span>
                    <span className="block opacity-70">{r.summary}</span>
                    <span className="block text-[0.72rem] opacity-55">
                      Last sign-in: {when(r.last_sign_in_at)}
                    </span>
                  </span>
                </div>
                <details className="ml-6 mt-1 text-[0.74rem] opacity-70">
                  <summary className="cursor-pointer">Details ({r.checks.length} checks)</summary>
                  <div className="mt-1 space-y-0.5">
                    {r.checks.map((c) => (
                      <div key={c.check}>
                        {c.passed ? "PASS" : "FAIL"} · {c.check.replace(/_/g, " ")} — {c.detail}
                      </div>
                    ))}
                  </div>
                </details>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[0.72rem] opacity-55">
            Checks account state only — no password is read, tested or displayed.
          </p>
        </div>
      )}

      <div className="mt-3 space-y-2 border-t pt-3" style={{ borderColor: "hsl(var(--ss-sand))" }}>
        {loading && <Loader2 size={16} className="animate-spin" />}
        {!loading && !rows.length && (
          <p className="text-[0.8rem] opacity-60">No test accounts registered yet.</p>
        )}
        {rows.map((r) => (
          <div key={r.id} className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <Chip tone={r.environment === "production" ? "burgundy" : "aqua"}>
                  {r.environment}
                </Chip>
                <Chip tone="ink">{r.role}</Chip>
                <span className="text-[0.88rem] font-semibold">{r.label}</span>
              </div>
              <div className="text-[0.74rem] opacity-65">
                {r.email} · rotated {when(r.last_rotated_at)} · {r.rotation_count}×
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                className="ss-btn"
                disabled={busy === r.id}
                onClick={() => void doRotate(r, "reveal")}
              >
                {busy === r.id ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <RotateCw size={13} />
                )}
                Rotate
              </button>
              <button
                className="ss-btn"
                disabled={busy === r.id}
                onClick={() => void doRotate(r, "link")}
                title="Email a one-time reset link instead of showing a password"
              >
                <Mail size={13} /> Reset link
              </button>
              <button
                className="ss-btn"
                onClick={async () => {
                  await remove({ data: { id: r.id } });
                  void load();
                }}
                aria-label={`Remove ${r.label}`}
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-3 flex items-start gap-1.5 text-[0.72rem] opacity-60">
        <KeyRound size={12} className="mt-0.5 shrink-0" />
        Preview and production keep separate registries; an account can only be rotated from the
        environment it belongs to.
      </p>
    </div>
  );
}
