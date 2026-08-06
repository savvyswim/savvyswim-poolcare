import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, RefreshCw, AlertTriangle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { EmptyState } from "@/crm/components/Brand";
import { money2 } from "@/crm/lib/pricing";
import { downloadCsv, todayIso } from "@/crm/finance/shared";
import { DEFAULT_PAY_CONFIG, PAY_SETTINGS_KEY } from "@/crm/lib/payPerPool";

type VisitRow = {
  id: string;
  scheduled_date: string;
  tech_id: string | null;
  upsell_amount: number | null;
  upsell_commission: number | null;
  payout_id: string | null;
  ss_customers: { id: string; full_name: string; tech_upsell_pct: number | null } | null;
};

type ItemRow = {
  id: string;
  visit_id: string | null;
  description: string;
  line_total: number | null;
  is_upsell: boolean | null;
  ss_invoices: { invoice_number: string; issued_on: string } | null;
};

type Line = {
  visitId: string;
  date: string;
  customer: string;
  invoiceNumbers: string;
  invoiceUpsell: number;
  visitUpsell: number;
  amountDelta: number;
  pct: number;
  expectedCommission: number;
  bookedCommission: number;
  commissionDelta: number;
  locked: boolean;
  ok: boolean;
};

const CENT = 0.01;
const firstOfMonth = () => {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().slice(0, 10);
};

export default function UpsellReconciliation() {
  const [from, setFrom] = useState(firstOfMonth());
  const [to, setTo] = useState(todayIso());
  const [loading, setLoading] = useState(true);
  const [visits, setVisits] = useState<VisitRow[]>([]);
  const [items, setItems] = useState<ItemRow[]>([]);
  const [defaultPct, setDefaultPct] = useState(DEFAULT_PAY_CONFIG.upsell_pct);
  const [onlyMismatch, setOnlyMismatch] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [v, i, s] = await Promise.all([
      supabase
        .from("ss_visits")
        .select("id, scheduled_date, tech_id, upsell_amount, upsell_commission, payout_id, ss_customers(id, full_name, tech_upsell_pct)")
        .gte("scheduled_date", from)
        .lte("scheduled_date", to)
        .order("scheduled_date", { ascending: false }),
      supabase
        .from("ss_invoice_items")
        .select("id, visit_id, description, line_total, is_upsell, ss_invoices(invoice_number, issued_on)")
        .eq("is_upsell", true)
        .not("visit_id", "is", null),
      supabase.from("ss_settings").select("value").eq("key", PAY_SETTINGS_KEY).maybeSingle(),
    ]);
    setVisits((v.data ?? []) as unknown as VisitRow[]);
    setItems((i.data ?? []) as unknown as ItemRow[]);
    const pct = Number((s.data?.value as { upsell_pct?: number } | null)?.upsell_pct);
    setDefaultPct(Number.isFinite(pct) && pct > 0 ? pct : DEFAULT_PAY_CONFIG.upsell_pct);
    setLoading(false);
  }, [from, to]);

  useEffect(() => {
    void load();
  }, [load]);

  const lines = useMemo<Line[]>(() => {
    const byVisit = new Map<string, ItemRow[]>();
    for (const it of items) {
      if (!it.visit_id) continue;
      byVisit.set(it.visit_id, [...(byVisit.get(it.visit_id) ?? []), it]);
    }
    const rows: Line[] = visits.map((v) => {
      const rel = byVisit.get(v.id) ?? [];
      const invoiceUpsell = rel.reduce((s, r) => s + Number(r.line_total ?? 0), 0);
      const visitUpsell = Number(v.upsell_amount ?? 0);
      const pct = Number(v.ss_customers?.tech_upsell_pct ?? defaultPct) || defaultPct;
      const expected = Math.round(invoiceUpsell * (pct / 100) * 100) / 100;
      const booked = Number(v.upsell_commission ?? 0);
      const amountDelta = Math.round((visitUpsell - invoiceUpsell) * 100) / 100;
      const commissionDelta = Math.round((booked - expected) * 100) / 100;
      return {
        visitId: v.id,
        date: v.scheduled_date,
        customer: v.ss_customers?.full_name ?? "—",
        invoiceNumbers: [...new Set(rel.map((r) => r.ss_invoices?.invoice_number).filter(Boolean))].join(", "),
        invoiceUpsell,
        visitUpsell,
        amountDelta,
        pct,
        expectedCommission: expected,
        bookedCommission: booked,
        commissionDelta,
        locked: !!v.payout_id,
        ok: Math.abs(amountDelta) < CENT && Math.abs(commissionDelta) < CENT,
      };
    });
    return rows.filter((r) => r.invoiceUpsell > 0 || r.visitUpsell > 0 || r.bookedCommission > 0);
  }, [visits, items, defaultPct]);

  // Upsell invoice lines pointing at visits outside the selected range / missing visits.
  const orphans = useMemo(() => {
    const ids = new Set(visits.map((v) => v.id));
    return items.filter((i) => i.visit_id && !ids.has(i.visit_id));
  }, [items, visits]);

  const totals = useMemo(
    () =>
      lines.reduce(
        (a, l) => ({
          invoiceUpsell: a.invoiceUpsell + l.invoiceUpsell,
          visitUpsell: a.visitUpsell + l.visitUpsell,
          expected: a.expected + l.expectedCommission,
          booked: a.booked + l.bookedCommission,
          mismatches: a.mismatches + (l.ok ? 0 : 1),
        }),
        { invoiceUpsell: 0, visitUpsell: 0, expected: 0, booked: 0, mismatches: 0 },
      ),
    [lines],
  );

  const shown = onlyMismatch ? lines.filter((l) => !l.ok) : lines;

  const exportCsv = () =>
    downloadCsv(`savvy-upsell-reconciliation-${from}-to-${to}.csv`, [
      ["Date", "Customer", "Invoice(s)", "Invoice upsell", "Visit upsell", "Amount delta", "Rate %", "Expected commission", "Booked commission", "Commission delta", "Locked", "Status"],
      ...lines.map((l) => [
        l.date,
        l.customer,
        l.invoiceNumbers,
        l.invoiceUpsell.toFixed(2),
        l.visitUpsell.toFixed(2),
        l.amountDelta.toFixed(2),
        l.pct,
        l.expectedCommission.toFixed(2),
        l.bookedCommission.toFixed(2),
        l.commissionDelta.toFixed(2),
        l.locked ? "yes" : "no",
        l.ok ? "match" : "mismatch",
      ]),
      [],
      ["Totals", "", "", totals.invoiceUpsell.toFixed(2), totals.visitUpsell.toFixed(2), (totals.visitUpsell - totals.invoiceUpsell).toFixed(2), "", totals.expected.toFixed(2), totals.booked.toFixed(2), (totals.booked - totals.expected).toFixed(2), "", `${totals.mismatches} mismatch(es)`],
    ]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-[0.7rem] opacity-70">
          <span className="ss-label block">From</span>
          <input type="date" className="ss-input" value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label className="text-[0.7rem] opacity-70">
          <span className="ss-label block">To</span>
          <input type="date" className="ss-input" value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
        <button className="ss-btn ss-btn-ghost" onClick={() => void load()} disabled={loading}>
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
        <button
          className={`ss-btn ${onlyMismatch ? "" : "ss-btn-ghost"}`}
          onClick={() => setOnlyMismatch((v) => !v)}
        >
          Mismatches only
        </button>
        <span className="flex-1" />
        <button className="ss-btn ss-btn-ghost" onClick={exportCsv}><Download size={13} /> Export CSV</button>
      </div>

      <div className="grid gap-2 sm:grid-cols-4">
        {[
          { l: "Invoice upsell lines", v: money2(totals.invoiceUpsell) },
          { l: "Visit upsell booked", v: money2(totals.visitUpsell) },
          { l: "Commission expected", v: money2(totals.expected) },
          { l: "Commission booked", v: money2(totals.booked) },
        ].map((c) => (
          <div key={c.l} className="ss-card p-3">
            <div className="ss-label">{c.l}</div>
            <div className="ss-num text-[1.05rem] font-semibold">{c.v}</div>
          </div>
        ))}
      </div>

      <div
        className="ss-card flex items-center gap-2 p-3 text-[0.8rem]"
        style={{ color: totals.mismatches ? "hsl(var(--ss-burgundy))" : "hsl(var(--ss-green))" }}
      >
        {totals.mismatches ? <AlertTriangle size={15} /> : <CheckCircle2 size={15} />}
        {totals.mismatches
          ? `${totals.mismatches} visit(s) don't reconcile — commission variance ${money2(totals.booked - totals.expected)}.`
          : "Every visit reconciles with its invoice upsell lines."}
      </div>

      {loading && !lines.length ? (
        <EmptyState>Loading upsell records…</EmptyState>
      ) : !shown.length ? (
        <EmptyState>No upsell activity in this range.</EmptyState>
      ) : (
        <div className="ss-card overflow-x-auto p-0">
          <table className="w-full text-[0.78rem]">
            <thead>
              <tr className="text-left opacity-60">
                {["Date", "Customer", "Invoice", "Invoice upsell", "Visit upsell", "Δ amount", "Rate", "Expected", "Booked", "Δ commission", ""].map((h) => (
                  <th key={h} className="px-3 py-2 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shown.map((l) => (
                <tr key={l.visitId} className="border-t" style={{ borderColor: "hsl(var(--ss-sand))" }}>
                  <td className="px-3 py-2 ss-num">{l.date}</td>
                  <td className="px-3 py-2">{l.customer}</td>
                  <td className="px-3 py-2 ss-num opacity-70">{l.invoiceNumbers || "—"}</td>
                  <td className="px-3 py-2 ss-num">{money2(l.invoiceUpsell)}</td>
                  <td className="px-3 py-2 ss-num">{money2(l.visitUpsell)}</td>
                  <td className="px-3 py-2 ss-num" style={{ color: Math.abs(l.amountDelta) < CENT ? undefined : "hsl(var(--ss-burgundy))" }}>
                    {money2(l.amountDelta)}
                  </td>
                  <td className="px-3 py-2 ss-num opacity-70">{l.pct}%</td>
                  <td className="px-3 py-2 ss-num">{money2(l.expectedCommission)}</td>
                  <td className="px-3 py-2 ss-num">{money2(l.bookedCommission)}</td>
                  <td className="px-3 py-2 ss-num" style={{ color: Math.abs(l.commissionDelta) < CENT ? undefined : "hsl(var(--ss-burgundy))" }}>
                    {money2(l.commissionDelta)}
                  </td>
                  <td className="px-3 py-2 text-[0.7rem] opacity-70">
                    {l.locked ? "locked payout" : l.ok ? "" : "review"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!!orphans.length && (
        <div className="ss-card p-3">
          <div className="ss-label mb-1">Upsell lines linked to visits outside this range ({orphans.length})</div>
          <div className="space-y-1 text-[0.78rem] opacity-80">
            {orphans.slice(0, 15).map((o) => (
              <div key={o.id} className="flex gap-2">
                <span className="ss-num">{o.ss_invoices?.invoice_number ?? "—"}</span>
                <span>{o.description}</span>
                <span className="flex-1" />
                <span className="ss-num">{money2(Number(o.line_total ?? 0))}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-[0.7rem] opacity-55">
        Internal only — commission rates and margins never appear on customer invoices.
      </p>
    </div>
  );
}
