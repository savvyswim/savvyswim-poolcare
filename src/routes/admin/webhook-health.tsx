import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getWebhookHealth, retryWebhookDelivery } from "@/lib/webhook-health.functions";
import type { ChannelHealth, WebhookDeliveryRow } from "@/lib/webhook-health.functions";

export const Route = createFileRoute("/admin/webhook-health")({
  component: WebhookHealthPage,
  head: () => ({
    meta: [
      { title: "Webhook Health · Savvy Swim Admin" },
      {
        name: "description",
        content:
          "Internal Savvy Swim admin console for monitoring lead, appointment and payment webhook delivery health, failures and retries.",
      },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Webhook Health · Savvy Swim Admin" },
      {
        property: "og:description",
        content: "Delivery health, failures and retry history for Savvy Swim webhooks.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const CHANNEL_LABEL: Record<string, string> = {
  lead: "Leads → CRM",
  appointment: "Appointments → customer",
  payment: "Payments → customer",
};

function when(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function OutcomePill({ outcome }: { outcome: string }) {
  const tone =
    outcome === "success"
      ? "bg-[#1FA9BE]/15 text-[#0f6b7a]"
      : outcome === "failed"
        ? "bg-[#8E1F2C]/12 text-[#8E1F2C]"
        : "bg-foreground/8 text-foreground/60";
  return (
    <span className={`px-2 py-0.5 text-[11px] uppercase tracking-[0.12em] font-semibold ${tone}`}>
      {outcome}
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

function HealthCard({ h }: { h: ChannelHealth }) {
  const bad = h.failed24h > 0;
  return (
    <div className={`border p-5 ${bad ? "border-[#8E1F2C]/50" : "border-foreground/15"}`}>
      <p className="text-[11px] uppercase tracking-[0.16em] text-foreground/50">
        {CHANNEL_LABEL[h.channel] ?? h.channel}
      </p>
      <p className="mt-2 font-display text-4xl">
        {h.successRate24h === null ? "—" : `${h.successRate24h}%`}
      </p>
      <p className="text-xs text-foreground/60">success · last 24h ({h.total24h} events)</p>
      <dl className="mt-4 space-y-1 text-xs text-foreground/70">
        <div className="flex justify-between">
          <dt>Failed 24h / 7d</dt>
          <dd className={bad ? "text-[#8E1F2C] font-semibold" : ""}>
            {h.failed24h} / {h.failed7d}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt>Retries 7d</dt>
          <dd>{h.retried7d}</dd>
        </div>
        <div className="flex justify-between">
          <dt>Last success</dt>
          <dd>{when(h.lastSuccessAt)}</dd>
        </div>
        <div className="flex justify-between">
          <dt>Last failure</dt>
          <dd>{when(h.lastFailureAt)}</dd>
        </div>
      </dl>
    </div>
  );
}

function WebhookHealthPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [tab, setTab] = useState<"failures" | "recent" | "retries">("failures");
  const queryClient = useQueryClient();
  const fetchHealth = useServerFn(getWebhookHealth);
  const retryFn = useServerFn(retryWebhookDelivery);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setAuthed(Boolean(data.session)));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) =>
      setAuthed(Boolean(session)),
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  const query = useQuery({
    queryKey: ["webhook-health"],
    queryFn: () => fetchHealth(),
    enabled: authed === true,
    refetchInterval: 60_000,
  });

  const retry = useMutation({
    mutationFn: (id: string) => retryFn({ data: { id } }),
    onSuccess: (res) => {
      if (res.ok) toast.success(res.detail || "Delivery retried");
      else toast.error(res.detail || "Retry failed");
      void queryClient.invalidateQueries({ queryKey: ["webhook-health"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const rows: WebhookDeliveryRow[] = useMemo(() => {
    const d = query.data;
    if (!d) return [];
    return tab === "failures" ? d.failures : tab === "retries" ? d.retries : d.recent;
  }, [query.data, tab]);

  if (authed === null) return <div className="p-10 text-sm text-foreground/60">Loading…</div>;
  if (!authed) return <SignIn onDone={() => setAuthed(true)} />;

  const err = query.error as Error | null;

  return (
    <main className="mx-auto max-w-6xl px-5 py-12">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-foreground/15 pb-6">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-[#8E1F2C]">Savvy Swim · Admin</p>
          <h1 className="font-display text-4xl uppercase tracking-[0.04em]">Webhook health</h1>
          <p className="mt-1 text-sm text-foreground/60">
            Lead handoffs, appointment status pushes and payment receipts — last 7 days.
          </p>
        </div>
        <button
          className="border border-foreground/25 px-4 py-2 text-xs uppercase tracking-[0.14em]"
          onClick={() => void query.refetch()}
        >
          Refresh
        </button>
      </header>

      {err ? (
        <p className="mt-8 border border-[#8E1F2C]/40 p-5 text-sm text-[#8E1F2C]">{err.message}</p>
      ) : null}

      {query.data ? (
        <>
          <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {query.data.health.map((h) => (
              <HealthCard key={h.channel} h={h} />
            ))}
          </section>

          <section className="mt-10 border border-foreground/15">
            <h2 className="border-b border-foreground/15 bg-foreground/5 p-3 text-[11px] uppercase tracking-[0.14em] text-foreground/60">
              Automated alerts (failures &amp; traffic spikes)
            </h2>
            {query.data.alerts.length === 0 ? (
              <p className="p-5 text-sm text-foreground/50">
                No alerts raised. On-call is paged by email and SMS when a channel fails
                repeatedly (401 / 400 / 5xx) or traffic spikes above normal.
              </p>
            ) : (
              <ul className="divide-y divide-foreground/10">
                {query.data.alerts.map((a) => (
                  <li key={a.id} className="p-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <span
                        className={`px-2 py-1 text-[10px] uppercase tracking-[0.14em] ${
                          a.alert_type === "spike"
                            ? "bg-[#1FA9BE]/15 text-[#1FA9BE]"
                            : "bg-[#8E1F2C]/15 text-[#8E1F2C]"
                        }`}
                      >
                        {a.alert_type}
                      </span>
                      <span className="text-sm font-medium">
                        {CHANNEL_LABEL[a.channel ?? ""] ?? a.channel ?? "all"}
                      </span>
                      <span className="text-xs text-foreground/60">
                        {a.failed_events}/{a.total_events} failed · {a.failure_rate}%
                        {a.baseline !== null ? ` · baseline ${a.baseline}` : ""} · fired{" "}
                        {a.alert_count}x
                      </span>
                      <span className="ml-auto text-xs text-foreground/50">
                        {new Date(a.last_alerted_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-xs text-foreground/70">{a.summary}</p>
                    {a.alert_result ? (
                      <p className="mt-1 text-[11px] text-foreground/45">Sent: {a.alert_result}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <nav className="mt-10 flex gap-2">
            {(["failures", "recent", "retries"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2 text-xs uppercase tracking-[0.14em] ${
                  tab === t
                    ? "bg-[#8E1F2C] text-[#F4EFE3]"
                    : "border border-foreground/20 text-foreground/70"
                }`}
              >
                {t}
              </button>
            ))}
          </nav>

          <div className="mt-4 overflow-x-auto border border-foreground/15">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-foreground/5 text-[11px] uppercase tracking-[0.12em] text-foreground/60">
                <tr>
                  <th className="p-3 text-left">Channel</th>
                  <th className="p-3 text-left">Reference</th>
                  <th className="p-3 text-left">Outcome</th>
                  <th className="p-3 text-left">Attempts</th>
                  <th className="p-3 text-left">Last attempt</th>
                  <th className="p-3 text-left">Error</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td className="p-6 text-foreground/50" colSpan={7}>
                      Nothing here — no {tab} in the last 7 days.
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => (
                    <tr key={r.id} className="border-t border-foreground/10 align-top">
                      <td className="p-3 whitespace-nowrap">{CHANNEL_LABEL[r.channel] ?? r.channel}</td>
                      <td className="p-3">{r.reference ?? r.event_key ?? "—"}</td>
                      <td className="p-3">
                        <OutcomePill outcome={r.outcome} />
                      </td>
                      <td className="p-3">
                        {r.attempts}
                        {r.retried_at ? (
                          <span className="ml-1 text-[11px] text-foreground/50">
                            (retried {when(r.retried_at)})
                          </span>
                        ) : null}
                      </td>
                      <td className="p-3 whitespace-nowrap">{when(r.last_attempt_at)}</td>
                      <td className="p-3 text-xs text-foreground/70">
                        {r.last_error ?? (r.http_status ? `HTTP ${r.http_status}` : "—")}
                      </td>
                      <td className="p-3 text-right">
                        <button
                          className="border border-foreground/25 px-3 py-1 text-[11px] uppercase tracking-[0.12em] disabled:opacity-50"
                          disabled={retry.isPending}
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
        </>
      ) : null}
    </main>
  );
}
