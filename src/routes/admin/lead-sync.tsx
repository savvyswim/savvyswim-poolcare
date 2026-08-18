import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  LEAD_STATUSES,
  getLeadSyncStatus,
  retryFailedLeadSyncs,
  retryLeadSync,
  setLeadStatus,
} from "@/lib/lead-sync.functions";
import type { LeadStatus, LeadSyncRow } from "@/lib/lead-sync.functions";

export const Route = createFileRoute("/admin/lead-sync")({
  component: LeadSyncPage,
  head: () => ({
    meta: [
      { title: "Lead CRM Sync · Savvy Swim Admin" },
      {
        name: "description",
        content:
          "Internal Savvy Swim console showing every website lead, whether it reached the CRM, the last attempt time and any error detail.",
      },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Lead CRM Sync · Savvy Swim Admin" },
      {
        property: "og:description",
        content: "Website lead handoff status, errors and manual retry.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function when(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function StatusPill({ status }: { status: LeadSyncRow["status"] }) {
  const tone =
    status === "synced"
      ? "bg-[#1FA9BE]/15 text-[#0f6b7a]"
      : status === "failed"
        ? "bg-[#8E1F2C]/12 text-[#8E1F2C]"
        : "bg-foreground/8 text-foreground/60";
  return (
    <span className={`px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] ${tone}`}>
      {status}
    </span>
  );
}

const LEAD_STATUS_TONE: Record<LeadStatus, string> = {
  new: "bg-foreground/8 text-foreground/70",
  scheduled: "bg-[#1FA9BE]/15 text-[#0f6b7a]",
  confirmed: "bg-[#1FA9BE]/30 text-[#0b4f5a]",
  declined: "bg-[#8E1F2C]/12 text-[#8E1F2C]",
  converted: "bg-[#8E1F2C] text-[#F4EFE3]",
};

function LeadStatusCell({
  value,
  onChange,
  disabled,
}: {
  value: LeadStatus;
  onChange: (next: LeadStatus) => void;
  disabled?: boolean;
}) {
  return (
    <select
      aria-label="Lead status"
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value as LeadStatus)}
      className={`border border-foreground/20 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] disabled:opacity-50 ${LEAD_STATUS_TONE[value]}`}
    >
      {LEAD_STATUSES.map((s) => (
        <option key={s} value={s} className="bg-background text-foreground">
          {s}
        </option>
      ))}
    </select>
  );
}

function SignIn({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <form
      className="mx-auto mt-24 w-full max-w-sm border border-foreground/15 bg-background p-8"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        setBusy(false);
        if (error) toast.error(error.message);
        else onDone();
      }}
    >
      <h1 className="font-display text-2xl uppercase tracking-[0.08em]">Admin sign in</h1>
      <p className="mt-2 text-sm text-foreground/60">Office and owner accounts only.</p>
      <input
        className="mt-6 w-full border border-foreground/20 bg-transparent px-3 py-2 text-sm"
        type="email"
        autoComplete="email"
        placeholder="you@savvyswim.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <input
        className="mt-3 w-full border border-foreground/20 bg-transparent px-3 py-2 text-sm"
        type="password"
        autoComplete="current-password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      <button
        className="mt-5 w-full bg-[#8E1F2C] px-4 py-2 text-sm uppercase tracking-[0.12em] text-[#F4EFE3] disabled:opacity-60"
        disabled={busy}
        type="submit"
      >
        {busy ? "Checking…" : "Sign in"}
      </button>
    </form>
  );
}

function LeadSyncPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [filter, setFilter] = useState<"all" | "failed" | "pending" | "synced">("all");
  const queryClient = useQueryClient();
  const fetchRows = useServerFn(getLeadSyncStatus);
  const retryFn = useServerFn(retryLeadSync);
  const retryAllFn = useServerFn(retryFailedLeadSyncs);
  const [autoRetry, setAutoRetry] = useState(true);
  const [retryRuns, setRetryRuns] = useState(0);
  const [retryTotals, setRetryTotals] = useState({ attempted: 0, recovered: 0 });
  const [lastRun, setLastRun] = useState<string | null>(null);
  const attemptedSignature = useRef<string>("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setAuthed(Boolean(data.session)));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) =>
      setAuthed(Boolean(session)),
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  const query = useQuery({
    queryKey: ["lead-sync"],
    queryFn: () => fetchRows(),
    enabled: authed === true,
    refetchInterval: 60_000,
  });

  const updateStatusFn = useServerFn(setLeadStatus);
  const updateStatus = useMutation({
    mutationFn: (v: { id: string; status: LeadStatus }) => updateStatusFn({ data: v }),
    onSuccess: (res) => {
      toast.success(`Lead marked ${res.status}`);
      void queryClient.invalidateQueries({ queryKey: ["lead-sync"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const retry = useMutation({
    mutationFn: (id: string) => retryFn({ data: { id } }),
    onSuccess: (res) => {
      if (res.ok) toast.success(res.detail);
      else toast.error(res.detail);
      void queryClient.invalidateQueries({ queryKey: ["lead-sync"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const bulkRetry = useMutation({
    mutationFn: () => retryAllFn(),
    onSuccess: (res) => {
      if (res.attempted === 0) return;
      setRetryRuns((n) => n + 1);
      setRetryTotals((t) => ({
        attempted: t.attempted + res.attempted,
        recovered: t.recovered + res.recovered,
      }));
      setLastRun(res.ranAt);
      if (res.recovered > 0) toast.success(`Auto-retry recovered ${res.recovered} of ${res.attempted} lead(s)`);
      else toast.error(`Auto-retry ran on ${res.attempted} lead(s), none reached the CRM`);
      void queryClient.invalidateQueries({ queryKey: ["lead-sync"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const failedIds = useMemo(
    () => (query.data ?? []).filter((r) => r.status === "failed").map((r) => r.id).sort().join(","),
    [query.data],
  );

  // Auto-retry each newly seen set of failed handoffs exactly once per load.
  useEffect(() => {
    if (!autoRetry || !failedIds) return;
    if (attemptedSignature.current === failedIds) return;
    if (bulkRetry.isPending) return;
    attemptedSignature.current = failedIds;
    bulkRetry.mutate();
  }, [autoRetry, failedIds, bulkRetry]);

  const rows = useMemo(() => {
    const all = query.data ?? [];
    return filter === "all" ? all : all.filter((r) => r.status === filter);
  }, [query.data, filter]);

  const counts = useMemo(() => {
    const all = query.data ?? [];
    return {
      total: all.length,
      synced: all.filter((r) => r.status === "synced").length,
      failed: all.filter((r) => r.status === "failed").length,
      pending: all.filter((r) => r.status === "pending").length,
    };
  }, [query.data]);

  if (authed === null) return <div className="p-10 text-sm text-foreground/60">Loading…</div>;
  if (!authed) return <SignIn onDone={() => setAuthed(true)} />;

  const err = query.error as Error | null;

  return (
    <main className="mx-auto max-w-6xl px-5 py-12">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-foreground/15 pb-6">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-[#8E1F2C]">Savvy Swim · Admin</p>
          <h1 className="font-display text-4xl uppercase tracking-[0.04em]">Lead CRM sync</h1>
          <p className="mt-1 text-sm text-foreground/60">
            Every website lead from the last 30 days and whether it reached the CRM.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/admin/lead-sources"
            className="border border-foreground/25 px-4 py-2 text-xs uppercase tracking-[0.14em] hover:text-[#8E1F2C]"
          >
            Lead sources
          </Link>
          <button
            className="border border-foreground/25 px-4 py-2 text-xs uppercase tracking-[0.14em]"
            onClick={() => void query.refetch()}
          >
            Refresh
          </button>
        </div>
      </header>

      <section className="mt-6 flex flex-wrap items-center justify-between gap-4 border border-foreground/15 p-5">
        <div>
          <p className="text-[11px] uppercase tracking-[0.16em] text-foreground/50">Auto-retry</p>
          <p className="mt-1 text-sm text-foreground/70">
            {bulkRetry.isPending
              ? "Re-sending failed handoffs…"
              : retryRuns === 0
                ? "Failed handoffs are re-sent automatically as soon as they appear."
                : `${retryRuns} retry run${retryRuns === 1 ? "" : "s"} · ${retryTotals.attempted} lead${
                    retryTotals.attempted === 1 ? "" : "s"
                  } retried · ${retryTotals.recovered} recovered${lastRun ? ` · last ${when(lastRun)}` : ""}`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs uppercase tracking-[0.12em] text-foreground/70">
            <input
              type="checkbox"
              checked={autoRetry}
              onChange={(e) => setAutoRetry(e.target.checked)}
            />
            Automatic
          </label>
          <button
            className="border border-foreground/25 px-4 py-2 text-xs uppercase tracking-[0.14em] disabled:opacity-50"
            disabled={bulkRetry.isPending || counts.failed === 0}
            onClick={() => bulkRetry.mutate()}
          >
            Retry failed now
          </button>
        </div>
      </section>

      {err ? (
        <p className="mt-8 border border-[#8E1F2C]/40 p-5 text-sm text-[#8E1F2C]">{err.message}</p>
      ) : null}

      <section className="mt-8 grid gap-4 sm:grid-cols-4">
        {(
          [
            ["Leads", counts.total],
            ["Synced", counts.synced],
            ["Failed", counts.failed],
            ["Pending", counts.pending],
          ] as const
        ).map(([label, value]) => (
          <div key={label} className="border border-foreground/15 p-5">
            <p className="text-[11px] uppercase tracking-[0.16em] text-foreground/50">{label}</p>
            <p className="mt-2 font-display text-4xl">{value}</p>
          </div>
        ))}
      </section>

      <nav className="mt-10 flex flex-wrap gap-2">
        {(["all", "failed", "pending", "synced"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`px-4 py-2 text-xs uppercase tracking-[0.14em] ${
              filter === t
                ? "bg-[#8E1F2C] text-[#F4EFE3]"
                : "border border-foreground/20 text-foreground/70"
            }`}
          >
            {t}
          </button>
        ))}
      </nav>

      <div className="mt-4 overflow-x-auto border border-foreground/15">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="bg-foreground/5 text-[11px] uppercase tracking-[0.12em] text-foreground/60">
            <tr>
              <th className="p-3 text-left">Lead</th>
              <th className="p-3 text-left">Received</th>
              <th className="p-3 text-left">ZIP</th>
              <th className="p-3 text-left">Consent</th>
              <th className="p-3 text-left">Lead status</th>
              <th className="p-3 text-left">Source</th>
              <th className="p-3 text-left">CRM status</th>
              <th className="p-3 text-left">CRM row</th>
              <th className="p-3 text-left">Last attempt</th>
              <th className="p-3 text-left">Error</th>
              <th className="p-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className="p-6 text-foreground/50" colSpan={11}>
                  No {filter === "all" ? "" : `${filter} `}leads in the last 30 days.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-t border-foreground/10 align-top">
                  <td className="p-3">
                    <span className="font-semibold">{r.full_name ?? "—"}</span>
                    <span className="block text-xs text-foreground/60">
                      {r.email ?? "—"} · {r.phone ?? "—"}
                    </span>
                  </td>
                  <td className="p-3 whitespace-nowrap">{when(r.created_at)}</td>
                  <td className="p-3 whitespace-nowrap text-xs text-foreground/70">
                    {r.postal_code ?? "—"}
                  </td>
                  <td className="p-3 text-xs">
                    <span
                      className={
                        r.contact_consent ? "text-[#1FA9BE]" : "text-foreground/50"
                      }
                      title={r.consent_text ?? undefined}
                    >
                      Calls/texts/email: {r.contact_consent ? "Yes" : "No"}
                    </span>
                  </td>
                  <td className="p-3">
                    <LeadStatusCell
                      value={r.lead_status}
                      disabled={updateStatus.isPending}
                      onChange={(next) => updateStatus.mutate({ id: r.id, status: next })}
                    />
                  </td>
                  <td className="p-3 text-xs text-foreground/70">
                    {r.source ?? "—"}
                    {r.lead_type ? ` · ${r.lead_type}` : ""}
                  </td>
                  <td className="p-3">
                    <StatusPill status={r.status} />
                    {r.attempts ? (
                      <span className="ml-1 text-[11px] text-foreground/50">
                        {r.attempts} attempt{r.attempts === 1 ? "" : "s"}
                      </span>
                    ) : null}
                  </td>
                  <td className="p-3 text-xs">
                    {r.crm_lead_id ? (
                      <button
                        type="button"
                        title="Copy CRM row id"
                        className="font-mono text-[11px] text-[#0f6b7a] underline underline-offset-2"
                        onClick={() => {
                          void navigator.clipboard?.writeText(r.crm_lead_id ?? "");
                          toast.success("CRM row id copied");
                        }}
                      >
                        {r.crm_lead_id.length > 12
                          ? `${r.crm_lead_id.slice(0, 8)}…${r.crm_lead_id.slice(-4)}`
                          : r.crm_lead_id}
                      </button>
                    ) : (
                      <span className="text-foreground/40">—</span>
                    )}
                  </td>
                  <td className="p-3 whitespace-nowrap">
                    {when(r.crm_synced_at ?? r.last_attempt_at)}
                  </td>
                  <td className="p-3 text-xs text-foreground/70">
                    {r.last_error ?? (r.http_status ? `HTTP ${r.http_status}` : "—")}
                  </td>
                  <td className="p-3 text-right">
                    <button
                      className="border border-foreground/25 px-3 py-1 text-[11px] uppercase tracking-[0.12em] disabled:opacity-50"
                      disabled={retry.isPending || r.status === "synced"}
                      onClick={() => retry.mutate(r.id)}
                    >
                      Retry
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
