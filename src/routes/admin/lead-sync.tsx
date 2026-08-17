import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getLeadSyncStatus, retryLeadSync } from "@/lib/lead-sync.functions";
import type { LeadSyncRow } from "@/lib/lead-sync.functions";

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

  const retry = useMutation({
    mutationFn: (id: string) => retryFn({ data: { id } }),
    onSuccess: (res) => {
      if (res.ok) toast.success(res.detail);
      else toast.error(res.detail);
      void queryClient.invalidateQueries({ queryKey: ["lead-sync"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

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
              <th className="p-3 text-left">Source</th>
              <th className="p-3 text-left">CRM status</th>
              <th className="p-3 text-left">Last attempt</th>
              <th className="p-3 text-left">Error</th>
              <th className="p-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className="p-6 text-foreground/50" colSpan={7}>
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
