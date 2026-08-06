import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { EmptyState } from "@/crm/components/Brand";
import { money2 } from "@/crm/lib/pricing";
import {
  ageDays,
  bucketFor,
  AGING_BUCKETS,
  downloadCsv,
  monthKey,
  monthLabel,
  recentMonths,
  todayIso,
  type FinanceSlice,
} from "@/crm/finance/shared";

type Report = "pl" | "aging" | "customers" | "tax" | "upsell";

const REPORTS: { key: Report; label: string; sub: string }[] = [
  { key: "pl", label: "Profit & loss", sub: "Income vs. expenses by month" },
  { key: "aging", label: "A/R aging", sub: "Who owes you and for how long" },
  { key: "customers", label: "Revenue by customer", sub: "Your best accounts" },
  { key: "tax", label: "Tax summary", sub: "Year-to-date totals for your accountant" },
  { key: "upsell", label: "Upsell reconciliation", sub: "Commission booked vs. upsell lines on invoices — mismatches flagged" },
];

export default function ReportsTab({ data }: { data: FinanceSlice }) {
  const { payments, expenses, invoices, customers } = data;
  const [report, setReport] = useState<Report>("pl");

  const nameOf = (id: string) => customers.find((c) => c.id === id)?.full_name ?? "—";

  const pl = useMemo(
    () =>
      recentMonths(12).map((m) => {
        const income = payments.filter((p) => monthKey(p.created_at) === m).reduce((s, p) => s + Number(p.amount), 0);
        const spend = expenses.filter((e) => monthKey(e.spent_on) === m).reduce((s, e) => s + Number(e.amount), 0);
        return { month: m, income, spend, net: income - spend };
      }),
    [payments, expenses],
  );

  const aging = useMemo(() => {
    const open = invoices.filter((i) => i.status !== "paid" && i.status !== "void");
    return AGING_BUCKETS.map((b) => ({
      bucket: b,
      rows: open.filter((i) => bucketFor(ageDays(i.issued_on)) === b),
    })).filter((g) => g.rows.length);
  }, [invoices]);

  const byCustomer = useMemo(() => {
    const m: Record<string, number> = {};
    for (const p of payments) if (p.customer_id) m[p.customer_id] = (m[p.customer_id] ?? 0) + Number(p.amount);
    return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 25);
  }, [payments]);

  const tax = useMemo(() => {
    const year = new Date().getFullYear().toString();
    const income = payments.filter((p) => p.created_at.startsWith(year)).reduce((s, p) => s + Number(p.amount), 0);
    const byCat: Record<string, number> = {};
    for (const e of expenses.filter((e) => e.spent_on.startsWith(year))) {
      byCat[e.category] = (byCat[e.category] ?? 0) + Number(e.amount);
    }
    const deductible = Object.values(byCat).reduce((s, v) => s + v, 0);
    return { year, income, byCat: Object.entries(byCat).sort((a, b) => b[1] - a[1]), deductible, net: income - deductible };
  }, [payments, expenses]);

  const exportCurrent = () => {
    if (report === "pl") {
      downloadCsv(`savvy-profit-loss-${todayIso()}.csv`, [
        ["Month", "Income", "Expenses", "Net"],
        ...pl.map((r) => [monthLabel(r.month), r.income.toFixed(2), r.spend.toFixed(2), r.net.toFixed(2)]),
      ]);
    } else if (report === "aging") {
      downloadCsv(`savvy-ar-aging-${todayIso()}.csv`, [
        ["Bucket", "Invoice", "Customer", "Issued", "Amount"],
        ...aging.flatMap((g) =>
          g.rows.map((i) => [g.bucket, i.invoice_number, nameOf(i.customer_id), i.issued_on, Number(i.amount).toFixed(2)]),
        ),
      ]);
    } else if (report === "customers") {
      downloadCsv(`savvy-revenue-by-customer-${todayIso()}.csv`, [
        ["Customer", "Lifetime paid"],
        ...byCustomer.map(([id, amt]) => [nameOf(id), amt.toFixed(2)]),
      ]);
    } else {
      downloadCsv(`savvy-tax-summary-${tax.year}.csv`, [
        ["Line", "Amount"],
        ["Gross income", tax.income.toFixed(2)],
        ...tax.byCat.map(([c, v]) => [c, v.toFixed(2)]),
        ["Total expenses", tax.deductible.toFixed(2)],
        ["Net income", tax.net.toFixed(2)],
      ]);
    }
  };

  const peak = Math.max(1, ...pl.map((r) => Math.max(r.income, r.spend)));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {REPORTS.map((r) => (
          <button key={r.key} className={`ss-btn ${report === r.key ? "" : "ss-btn-ghost"}`} onClick={() => setReport(r.key)}>
            {r.label}
          </button>
        ))}
        <span className="flex-1" />
        <button className="ss-btn ss-btn-ghost" onClick={exportCurrent}><Download size={13} /> Export CSV</button>
      </div>

      <p className="text-[0.75rem] opacity-60">{REPORTS.find((r) => r.key === report)?.sub}</p>

      {report === "pl" && (
        <div className="ss-card p-4">
          <div className="space-y-1.5">
            {pl.map((r) => (
              <div key={r.month} className="flex items-center gap-3 text-[0.8rem]">
                <span className="opacity-60" style={{ width: 74 }}>{monthLabel(r.month)}</span>
                <div className="flex flex-1 items-center gap-1">
                  <div style={{ width: `${(r.income / peak) * 50}%`, height: 8, background: "hsl(var(--ss-aqua))", borderRadius: 4 }} />
                  <div style={{ width: `${(r.spend / peak) * 50}%`, height: 8, background: "hsl(var(--ss-burgundy))", borderRadius: 4 }} />
                </div>
                <span className="ss-num" style={{ width: 84, textAlign: "right" }}>{money2(r.income)}</span>
                <span className="ss-num opacity-60" style={{ width: 84, textAlign: "right" }}>−{money2(r.spend)}</span>
                <span
                  className="ss-num font-semibold"
                  style={{ width: 90, textAlign: "right", color: r.net >= 0 ? "hsl(var(--ss-green))" : "hsl(var(--ss-burgundy))" }}
                >
                  {money2(r.net)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {report === "aging" && (
        <div className="space-y-3">
          {!aging.length && <EmptyState>Nothing outstanding — everything is collected.</EmptyState>}
          {aging.map((g) => (
            <div key={g.bucket} className="ss-card p-4">
              <div className="ss-label mb-2">
                {g.bucket} days · {money2(g.rows.reduce((s, i) => s + Number(i.amount), 0))}
              </div>
              <div className="space-y-1.5">
                {g.rows.map((i) => (
                  <div key={i.id} className="flex items-center gap-2 text-[0.8rem]">
                    <span className="ss-num">{i.invoice_number}</span>
                    <span className="opacity-70">{nameOf(i.customer_id)}</span>
                    <span className="flex-1" />
                    <span className="opacity-50">{ageDays(i.issued_on)}d</span>
                    <span className="ss-num font-semibold">{money2(i.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {report === "customers" && (
        <div className="ss-card p-4">
          {!byCustomer.length && <EmptyState>No payments recorded yet.</EmptyState>}
          <div className="space-y-1.5">
            {byCustomer.map(([id, amt], idx) => (
              <div key={id} className="flex items-center gap-2 text-[0.8rem]">
                <span className="ss-num opacity-40" style={{ width: 20 }}>{idx + 1}</span>
                <span>{nameOf(id)}</span>
                <span className="flex-1" />
                <span className="ss-num font-semibold">{money2(amt)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {report === "tax" && (
        <div className="ss-card p-4 space-y-2">
          <div className="ss-label mb-1">{tax.year} year to date</div>
          <div className="flex items-center justify-between text-[0.85rem]">
            <span>Gross income</span>
            <span className="ss-num font-semibold">{money2(tax.income)}</span>
          </div>
          <div className="border-t pt-2" style={{ borderColor: "hsl(var(--ss-sand))" }}>
            {tax.byCat.map(([c, v]) => (
              <div key={c} className="flex items-center justify-between text-[0.8rem] opacity-80">
                <span>{c}</span>
                <span className="ss-num">−{money2(v)}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between border-t pt-2 text-[0.85rem]" style={{ borderColor: "hsl(var(--ss-sand))" }}>
            <span>Total expenses</span>
            <span className="ss-num font-semibold">−{money2(tax.deductible)}</span>
          </div>
          <div className="flex items-center justify-between text-[0.95rem] font-semibold">
            <span>Net income</span>
            <span className="ss-num" style={{ color: tax.net >= 0 ? "hsl(var(--ss-green))" : "hsl(var(--ss-burgundy))" }}>
              {money2(tax.net)}
            </span>
          </div>
          <p className="text-[0.7rem] opacity-55">
            Summary only — hand the export to your accountant at filing time.
          </p>
        </div>
      )}
    </div>
  );
}
