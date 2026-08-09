import { useEffect, useMemo, useState } from "react";
import { Link } from "@/lib/router-compat";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Panel, StatCard, BarRow } from "@/crm/components/Kit";
import { getWorkspace, type WorkspaceKey } from "@/crm/lib/workspaces";
import { useSavvyIdentity } from "@/crm/lib/useSavvy";
import { ArrowUpRight } from "lucide-react";

type Snapshot = {
  customers: number;
  openLeads: number;
  leadsBySource: { name: string; count: number }[];
  inspections30: number;
  inspectionsConverted: number;
  quotesOpen: number;
  quotesAccepted30: number;
  visits7: number;
  visits30: number;
  openJobs: number;
  openAlerts: number;
  invoicedMTD: number;
  collectedMTD: number;
  outstanding: number;
};

const EMPTY: Snapshot = {
  customers: 0, openLeads: 0, leadsBySource: [], inspections30: 0, inspectionsConverted: 0,
  quotesOpen: 0, quotesAccepted30: 0, visits7: 0, visits30: 0, openJobs: 0, openAlerts: 0,
  invoicedMTD: 0, collectedMTD: 0, outstanding: 0,
};

const money = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

function monthStart() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
}

function useSnapshot() {
  const [snap, setSnap] = useState<Snapshot>(EMPTY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const count = { count: "exact" as const, head: true };
      const [
        customers, leads, leadRows, insp, inspConv, quotes, quotesAcc,
        visits7, visits30, jobs, alerts, invoices,
      ] = await Promise.all([
        supabase.from("ss_customers").select("id", count),
        supabase.from("ss_leads").select("id", count).not("stage", "in", '("won","lost")'),
        supabase.from("ss_leads").select("source").gte("created_at", daysAgo(90)),
        supabase.from("inspection_requests").select("id", count).gte("created_at", daysAgo(30)),
        supabase.from("inspection_requests").select("id", count).gte("created_at", daysAgo(30)).not("converted_at", "is", null),
        supabase.from("ss_quotes").select("id", count).eq("status", "sent"),
        supabase.from("ss_quotes").select("id", count).gte("accepted_at", daysAgo(30)),
        supabase.from("ss_visits").select("id", count).gte("completed_at", daysAgo(7)),
        supabase.from("ss_visits").select("id", count).gte("completed_at", daysAgo(30)),
        supabase.from("ss_jobs").select("id", count).neq("status", "done"),
        supabase.from("ss_alerts").select("id", count).eq("is_resolved", false),
        supabase.from("ss_invoices").select("amount, status, paid_at, created_at"),
      ]);

      if (cancelled) return;

      const sources = new Map<string, number>();
      for (const row of leadRows.data ?? []) {
        const key = (row as { source: string | null }).source || "Unknown";
        sources.set(key, (sources.get(key) ?? 0) + 1);
      }

      const ms = monthStart();
      let invoicedMTD = 0;
      let collectedMTD = 0;
      let outstanding = 0;
      for (const inv of (invoices.data ?? []) as { amount: number | null; status: string; paid_at: string | null; created_at: string }[]) {
        const amt = Number(inv.amount ?? 0);
        if (inv.created_at >= ms) invoicedMTD += amt;
        if (inv.paid_at && inv.paid_at >= ms) collectedMTD += amt;
        if (!inv.paid_at && inv.status !== "void") outstanding += amt;
      }

      setSnap({
        customers: customers.count ?? 0,
        openLeads: leads.count ?? 0,
        leadsBySource: [...sources.entries()]
          .map(([name, c]) => ({ name, count: c }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 6),
        inspections30: insp.count ?? 0,
        inspectionsConverted: inspConv.count ?? 0,
        quotesOpen: quotes.count ?? 0,
        quotesAccepted30: quotesAcc.count ?? 0,
        visits7: visits7.count ?? 0,
        visits30: visits30.count ?? 0,
        openJobs: jobs.count ?? 0,
        openAlerts: alerts.count ?? 0,
        invoicedMTD,
        collectedMTD,
        outstanding,
      });
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { snap, loading };
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

/** Shortcut grid built from the workspace's own nav. */
function Shortcuts({ ws }: { ws: WorkspaceKey }) {
  const workspace = getWorkspace(ws);
  const items = workspace.items.filter((i) => !i.to.endsWith(workspace.home));
  return (
    <Panel title="Jump to" sub={`Everything in the ${workspace.label.toLowerCase()} workspace`}>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {items.map((i) => {
          const Icon = i.icon;
          return (
            <Link
              key={i.to + i.label}
              to={i.to}
              className="flex items-center gap-2 rounded-[8px] border p-2 !no-underline !text-inherit"
              style={{ borderColor: "hsl(var(--ss-line))" }}
            >
              <Icon size={15} className="shrink-0 opacity-60" />
              <span className="min-w-0 truncate text-[0.8rem]">{i.label}</span>
            </Link>
          );
        })}
      </div>
    </Panel>
  );
}

export default function WorkspaceHome({ workspace }: { workspace: WorkspaceKey }) {
  const ws = getWorkspace(workspace);
  const { snap, loading } = useSnapshot();
  const id = useSavvyIdentity();

  const convRate = useMemo(
    () => (snap.inspections30 ? Math.round((snap.inspectionsConverted / snap.inspections30) * 100) : 0),
    [snap],
  );
  const maxSource = Math.max(1, ...snap.leadsBySource.map((s) => s.count));

  const cards = {
    myday: [
      { label: "Visits this week", value: String(snap.visits7), hint: `${snap.visits30} in the last 30 days` },
      { label: "Open jobs", value: String(snap.openJobs) },
      { label: "Open alerts", value: String(snap.openAlerts), trend: snap.openAlerts ? ("down" as const) : ("flat" as const) },
      { label: "Active customers", value: String(snap.customers) },
    ],
    marketing: [
      { label: "Inspection requests (30d)", value: String(snap.inspections30) },
      { label: "Converted", value: String(snap.inspectionsConverted), hint: `${convRate}% of requests`, trend: "up" as const },
      { label: "Open leads", value: String(snap.openLeads) },
      { label: "Customers", value: String(snap.customers) },
    ],
    sales: [
      { label: "Quotes out", value: String(snap.quotesOpen) },
      { label: "Accepted (30d)", value: String(snap.quotesAccepted30), trend: "up" as const },
      { label: "Open leads", value: String(snap.openLeads) },
      { label: "Customers", value: String(snap.customers) },
    ],
    operations: [
      { label: "Visits this week", value: String(snap.visits7) },
      { label: "Visits (30d)", value: String(snap.visits30) },
      { label: "Open jobs", value: String(snap.openJobs) },
      { label: "Open alerts", value: String(snap.openAlerts), trend: snap.openAlerts ? ("down" as const) : ("flat" as const) },
    ],
    financial: [
      { label: "Invoiced this month", value: money(snap.invoicedMTD) },
      { label: "Collected this month", value: money(snap.collectedMTD), trend: "up" as const },
      { label: "Outstanding", value: money(snap.outstanding), trend: snap.outstanding ? ("down" as const) : ("flat" as const) },
      { label: "Customers billed", value: String(snap.customers) },
    ],
    field: [
      { label: "Visits this week", value: String(snap.visits7) },
      { label: "Open jobs", value: String(snap.openJobs) },
      { label: "Open alerts", value: String(snap.openAlerts) },
      { label: "Visits (30d)", value: String(snap.visits30) },
    ],
    admin: [
      { label: "Customers", value: String(snap.customers) },
      { label: "Open jobs", value: String(snap.openJobs) },
      { label: "Open alerts", value: String(snap.openAlerts) },
      { label: "Visits (30d)", value: String(snap.visits30) },
    ],
  }[workspace];

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow={`${ws.label} workspace`}
        title={
          workspace === "myday"
            ? `${greeting()}${id.staffName ? `, ${id.staffName.split(" ")[0]}` : ""}`
            : `${ws.label} overview`
        }
        sub={ws.blurb}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((c) => (
          <StatCard key={c.label} {...c} />
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Shortcuts ws={workspace} />
        </div>

        <div className="space-y-3">
          {(workspace === "marketing" || workspace === "sales" || workspace === "myday") && (
            <Panel
              title="Where leads come from"
              sub="Last 90 days"
              right={
                <Link to="/admin/crm/pipeline" className="text-[0.75rem] !no-underline">
                  Pipeline <ArrowUpRight size={11} className="inline" />
                </Link>
              }
            >
              {snap.leadsBySource.length === 0 ? (
                <p className="text-[0.8rem] opacity-60">{loading ? "Loading…" : "No leads recorded yet."}</p>
              ) : (
                snap.leadsBySource.map((s) => (
                  <BarRow key={s.name} label={s.name} value={s.count} max={maxSource} />
                ))
              )}
            </Panel>
          )}

          {(workspace === "financial" || workspace === "admin") && (
            <Panel title="Cash position" sub="Month to date">
              <BarRow label="Invoiced" value={snap.invoicedMTD} max={Math.max(1, snap.invoicedMTD)} display={money(snap.invoicedMTD)} tone="aqua" />
              <BarRow label="Collected" value={snap.collectedMTD} max={Math.max(1, snap.invoicedMTD)} display={money(snap.collectedMTD)} tone="green" />
              <BarRow label="Outstanding" value={snap.outstanding} max={Math.max(1, snap.invoicedMTD || snap.outstanding)} display={money(snap.outstanding)} tone="burgundy" />
            </Panel>
          )}

          {(workspace === "operations" || workspace === "field") && (
            <Panel title="Service load" sub="Completed visits">
              <BarRow label="This week" value={snap.visits7} max={Math.max(1, snap.visits30)} tone="aqua" />
              <BarRow label="Last 30 days" value={snap.visits30} max={Math.max(1, snap.visits30)} tone="green" />
              <BarRow label="Open jobs" value={snap.openJobs} max={Math.max(1, snap.visits30)} tone="gold" />
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}
