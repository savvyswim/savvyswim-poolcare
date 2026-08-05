import { useMemo } from "react";
import { Chip, EmptyState, StatTile } from "@/crm/components/Brand";
import { money, money2 } from "@/crm/lib/pricing";
import {
  ageDays,
  bucketFor,
  monthKey,
  monthLabel,
  recentMonths,
  thisMonthKey,
  type FinanceSlice,
} from "@/crm/finance/shared";

export default function FinanceOverview({ data }: { data: FinanceSlice }) {
  const { invoices, payments, expenses } = data;
  const month = thisMonthKey();

  const stats = useMemo(() => {
    const collected = payments
      .filter((p) => monthKey(p.created_at) === month)
      .reduce((s, p) => s + Number(p.amount), 0);
    const recurring = payments
      .filter((p) => monthKey(p.created_at) === month && p.kind === "recurring")
      .reduce((s, p) => s + Number(p.amount), 0);
    const spent = expenses
      .filter((e) => monthKey(e.spent_on) === month)
      .reduce((s, e) => s + Number(e.amount), 0);
    const open = invoices.filter((i) => i.status !== "paid" && i.status !== "void");
    const outstanding = open.reduce((s, i) => s + Number(i.amount), 0);
    const overdue = open
      .filter((i) => ageDays(i.issued_on) > 30)
      .reduce((s, i) => s + Number(i.amount), 0);
    return {
      collected,
      recurring,
      jobs: collected - recurring,
      spent,
      outstanding,
      overdue,
      net: collected - spent,
      margin: collected > 0 ? Math.round(((collected - spent) / collected) * 100) : 0,
    };
  }, [payments, expenses, invoices, month]);

  const trend = useMemo(() => {
    const months = recentMonths(6).reverse();
    return months.map((m) => ({
      key: m,
      income: payments.filter((p) => monthKey(p.created_at) === m).reduce((s, p) => s + Number(p.amount), 0),
      spend: expenses.filter((e) => monthKey(e.spent_on) === m).reduce((s, e) => s + Number(e.amount), 0),
    }));
  }, [payments, expenses]);

  const peak = Math.max(1, ...trend.map((t) => Math.max(t.income, t.spend)));

  const aging = useMemo(() => {
    const m: Record<string, number> = {};
    for (const i of invoices.filter((x) => x.status !== "paid" && x.status !== "void")) {
      const b = bucketFor(ageDays(i.issued_on));
      m[b] = (m[b] ?? 0) + Number(i.amount);
    }
    return m;
  }, [invoices]);

  const byCategory = useMemo(() => {
    const m: Record<string, number> = {};
    for (const e of expenses.filter((x) => monthKey(x.spent_on) === month)) {
      m[e.category] = (m[e.category] ?? 0) + Number(e.amount);
    }
    return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [expenses, month]);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Collected this month" value={money(stats.collected)} tone="hero" />
        <StatTile label="Spent this month" value={money(stats.spent)} />
        <StatTile label="Net profit" value={money(stats.net)} />
        <StatTile label="Margin" value={`${stats.margin}%`} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Recurring plans" value={money(stats.recurring)} />
        <StatTile label="Jobs & repairs" value={money(stats.jobs)} />
        <StatTile label="Outstanding A/R" value={money(stats.outstanding)} />
        <StatTile label="Over 30 days" value={money(stats.overdue)} />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="ss-card p-4">
          <div className="ss-label mb-3">Cash in vs. out · last 6 months</div>
          <div className="flex items-end gap-3" style={{ height: 150 }}>
            {trend.map((t) => (
              <div key={t.key} className="flex flex-1 flex-col items-center gap-1.5">
                <div className="flex h-full w-full items-end justify-center gap-1">
                  <div
                    title={`In ${money(t.income)}`}
                    style={{
                      width: 12,
                      height: `${(t.income / peak) * 100}%`,
                      background: "hsl(var(--ss-aqua))",
                      borderRadius: "3px 3px 0 0",
                      minHeight: 2,
                    }}
                  />
                  <div
                    title={`Out ${money(t.spend)}`}
                    style={{
                      width: 12,
                      height: `${(t.spend / peak) * 100}%`,
                      background: "hsl(var(--ss-burgundy))",
                      borderRadius: "3px 3px 0 0",
                      minHeight: 2,
                    }}
                  />
                </div>
                <span className="ss-tag" style={{ fontSize: "0.5rem" }}>
                  {monthLabel(t.key).split(" ")[0]}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex gap-3 text-[0.7rem] opacity-70">
            <span className="flex items-center gap-1.5">
              <i className="inline-block h-2 w-2 rounded-full" style={{ background: "hsl(var(--ss-aqua))" }} /> Money in
            </span>
            <span className="flex items-center gap-1.5">
              <i className="inline-block h-2 w-2 rounded-full" style={{ background: "hsl(var(--ss-burgundy))" }} /> Money out
            </span>
          </div>
        </div>

        <div className="ss-card p-4">
          <div className="ss-label mb-3">Receivables aging</div>
          {!Object.keys(aging).length && <EmptyState>Everything is collected.</EmptyState>}
          <div className="space-y-2">
            {(["Current", "1–30", "31–60", "61–90", "90+"] as const)
              .filter((b) => aging[b])
              .map((b) => (
                <div key={b}>
                  <div className="flex items-center justify-between text-[0.8rem]">
                    <span className="flex items-center gap-2">
                      {b} days
                      {(b === "61–90" || b === "90+") && <Chip tone="burgundy">chase</Chip>}
                    </span>
                    <span className="ss-num font-semibold">{money2(aging[b])}</span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full" style={{ background: "hsl(var(--ss-sand))" }}>
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.round((aging[b] / Math.max(...Object.values(aging))) * 100)}%`,
                        background: b === "90+" ? "hsl(var(--ss-burgundy))" : "hsl(var(--ss-gold))",
                      }}
                    />
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>

      <div className="ss-card p-4">
        <div className="ss-label mb-2">Where the money went this month</div>
        {!byCategory.length && <EmptyState>No expenses recorded this month.</EmptyState>}
        <div className="grid gap-2 sm:grid-cols-2">
          {byCategory.map(([cat, amt]) => (
            <div key={cat}>
              <div className="flex items-center justify-between text-[0.8rem]">
                <span>{cat}</span>
                <span className="ss-num font-semibold">{money2(amt)}</span>
              </div>
              <div className="mt-1 h-1.5 rounded-full" style={{ background: "hsl(var(--ss-sand))" }}>
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.round((amt / byCategory[0][1]) * 100)}%`,
                    background: "hsl(var(--ss-burgundy))",
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
