import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, FlaskConical } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Chip, EmptyState, SectionTitle, StatTile } from "@/crm/components/Brand";
import { money2 } from "@/crm/lib/pricing";

type AppliedLine = {
  name?: string;
  dose_key?: string;
  unit?: string;
  qty?: number;
  cost?: number;
  cost_per_unit?: number;
  body_id?: string | null;
  body_name?: string | null;
};

type Dosing = {
  applied?: AppliedLine[];
  applied_cost?: number;
  estimated_cost?: number;
  bodies?: { id: string | null; name: string; applied?: AppliedLine[]; cost?: number }[];
};

type VisitRow = {
  id: string;
  scheduled_date: string;
  chem_cost: number | null;
  dosing: Dosing | null;
  ss_customers: { full_name: string } | null;
  ss_staff: { full_name: string } | null;
};

type Line = {
  visitId: string;
  date: string;
  customer: string;
  tech: string;
  body: string;
  product: string;
  unit: string;
  qty: number;
  costPerUnit: number;
  cost: number;
};

const csvCell = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;

/**
 * Job-level chemical cost report: every product poured, grouped by body of
 * water, with per-visit totals and a CSV export for the books.
 */
export default function ChemCosts() {
  const [visits, setVisits] = useState<VisitRow[]>([]);
  const [moves, setMoves] = useState<MoveRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState(new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10));
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const [q, setQ] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("ss_visits")
      .select("id,scheduled_date,chem_cost,dosing,ss_customers(full_name),ss_staff(full_name)")
      .gte("scheduled_date", from)
      .lte("scheduled_date", to)
      .order("scheduled_date", { ascending: false })
      .limit(1000);
    const rows = (data ?? []) as unknown as VisitRow[];
    setVisits(rows);

    const ids = rows.map((v) => v.id);
    if (ids.length) {
      const { data: mv } = await supabase
        .from("ss_inventory_moves")
        .select("visit_id,item_name,delta,unit_cost,total_cost,entered_qty,entered_unit")
        .in("visit_id", ids)
        .lt("delta", 0)
        .limit(4000);
      setMoves((mv ?? []) as unknown as MoveRow[]);
    } else {
      setMoves([]);
    }
    setLoading(false);
  }, [from, to]);

  useEffect(() => {
    void load();
  }, [load]);

  const lines = useMemo<Line[]>(() => {
    const out: Line[] = [];
    const byVisit = new Map(visits.map((v) => [v.id, v]));
    for (const v of visits) {
      const d = v.dosing ?? {};
      const flat: AppliedLine[] = d.applied?.length
        ? d.applied
        : (d.bodies ?? []).flatMap((b) => (b.applied ?? []).map((a) => ({ ...a, body_name: b.name })));
      for (const a of flat) {
        const qty = Number(a.qty ?? 0);
        const cost = Number(a.cost ?? (Number(a.cost_per_unit ?? 0) * qty));
        if (!qty && !cost) continue;
        out.push({
          visitId: v.id,
          date: v.scheduled_date,
          customer: v.ss_customers?.full_name ?? "—",
          tech: v.ss_staff?.full_name ?? "Unassigned",
          body: a.body_name || "Main pool",
          product: a.name || a.dose_key || "Chemical",
          unit: a.unit || "oz",
          qty,
          costPerUnit: Number(a.cost_per_unit ?? (qty ? cost / qty : 0)),
          cost,
        });
      }
    }
    // Truck stock pulled on the visit — costed at the unit cost recorded on the move.
    for (const m of moves) {
      const v = m.visit_id ? byVisit.get(m.visit_id) : null;
      if (!v) continue;
      const qty = Math.abs(Number(m.delta) || 0);
      const cost = Number(m.total_cost ?? 0);
      if (!qty && !cost) continue;
      out.push({
        visitId: v.id,
        date: v.scheduled_date,
        customer: v.ss_customers?.full_name ?? "—",
        tech: v.ss_staff?.full_name ?? "Unassigned",
        body: "Truck stock",
        product: m.item_name,
        unit: m.entered_unit || "ea",
        qty: Number(m.entered_qty ?? qty),
        costPerUnit: Number(m.unit_cost ?? (qty ? cost / qty : 0)),
        cost,
      });
    }

    const needle = q.trim().toLowerCase();
    return needle
      ? out.filter((l) =>
          `${l.customer} ${l.product} ${l.body} ${l.tech}`.toLowerCase().includes(needle),
        )
      : out;
  }, [visits, q]);

  /** Visit → body of water → product rollup. */
  const jobs = useMemo(() => {
    const map = new Map<
      string,
      { date: string; customer: string; tech: string; total: number; bodies: Map<string, Line[]> }
    >();
    for (const l of lines) {
      const job =
        map.get(l.visitId) ??
        { date: l.date, customer: l.customer, tech: l.tech, total: 0, bodies: new Map<string, Line[]>() };
      job.total += l.cost;
      job.bodies.set(l.body, [...(job.bodies.get(l.body) ?? []), l]);
      map.set(l.visitId, job);
    }
    return [...map.entries()].sort((a, b) => (a[1].date < b[1].date ? 1 : -1));
  }, [lines]);

  const byProduct = useMemo(() => {
    const map = new Map<string, { qty: number; unit: string; cost: number }>();
    for (const l of lines) {
      const cur = map.get(l.product) ?? { qty: 0, unit: l.unit, cost: 0 };
      cur.qty += l.qty;
      cur.cost += l.cost;
      map.set(l.product, cur);
    }
    return [...map.entries()].sort((a, b) => b[1].cost - a[1].cost);
  }, [lines]);

  const totals = useMemo(() => {
    const cost = lines.reduce((s, l) => s + l.cost, 0);
    return { cost, jobs: jobs.length, perJob: jobs.length ? cost / jobs.length : 0 };
  }, [lines, jobs]);

  function exportCsv() {
    const header = [
      "Visit date",
      "Customer",
      "Technician",
      "Body of water",
      "Product",
      "Quantity",
      "Unit",
      "Cost per unit",
      "Line cost",
      "Visit total",
    ];
    const visitTotal = new Map(jobs.map(([id, j]) => [id, j.total]));
    const body = lines
      .slice()
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.customer.localeCompare(b.customer)))
      .map((l) =>
        [
          l.date,
          l.customer,
          l.tech,
          l.body,
          l.product,
          l.qty,
          l.unit,
          l.costPerUnit.toFixed(4),
          l.cost.toFixed(2),
          (visitTotal.get(l.visitId) ?? 0).toFixed(2),
        ]
          .map(csvCell)
          .join(","),
      );
    const grand = ["", "", "", "", "TOTAL", "", "", "", totals.cost.toFixed(2), ""].map(csvCell).join(",");
    const csv = [header.map(csvCell).join(","), ...body, grand].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `savvy-chemical-cost_${from}_${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <SectionTitle
        title="Chemical cost by job"
        sub="Every product poured, broken out by body of water, with per-visit totals."
      />

      <div className="ss-card flex flex-wrap items-end gap-2 p-3.5">
        <label className="text-[0.7rem] opacity-80">
          <span className="ss-tag block">From</span>
          <input type="date" className="ss-input !w-auto" value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label className="text-[0.7rem] opacity-80">
          <span className="ss-tag block">To</span>
          <input type="date" className="ss-input !w-auto" value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
        <label className="min-w-[180px] flex-1 text-[0.7rem] opacity-80">
          <span className="ss-tag block">Search</span>
          <input
            className="ss-input"
            placeholder="Customer, product, body of water, tech"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </label>
        <button className="ss-btn" onClick={exportCsv} disabled={!lines.length}>
          <Download size={13} /> Export CSV
        </button>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <StatTile label="Chemical spend" value={money2(totals.cost)} />
        <StatTile label="Jobs with chemicals" value={String(totals.jobs)} />
        <StatTile label="Average per job" value={money2(totals.perJob)} />
      </div>

      {byProduct.length > 0 && (
        <div className="ss-card p-3.5">
          <div className="ss-label">By product</div>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-[0.78rem]">
              <thead>
                <tr className="ss-tag text-left">
                  <th className="py-1">Product</th>
                  <th className="py-1 text-right">Quantity</th>
                  <th className="py-1 text-right">Cost</th>
                  <th className="py-1 text-right">Share</th>
                </tr>
              </thead>
              <tbody>
                {byProduct.map(([name, p]) => (
                  <tr key={name} className="border-t border-black/10">
                    <td className="py-1">{name}</td>
                    <td className="py-1 text-right ss-num">
                      {Math.round(p.qty * 10) / 10} {p.unit}
                    </td>
                    <td className="py-1 text-right ss-num">{money2(p.cost)}</td>
                    <td className="py-1 text-right ss-num">
                      {totals.cost ? Math.round((p.cost / totals.cost) * 100) : 0}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {loading && <EmptyState>Loading chemical logs…</EmptyState>}
      {!loading && !jobs.length && (
        <EmptyState>No chemicals logged in this window — techs log what they pour on the visit sheet.</EmptyState>
      )}

      {jobs.map(([visitId, job]) => (
        <div key={visitId} className="ss-card p-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="font-semibold">{job.customer}</div>
              <div className="text-[0.72rem] opacity-70">
                {job.date} · {job.tech}
              </div>
            </div>
            <div className="text-right">
              <div className="ss-num text-[1.05rem] font-bold leading-none">{money2(job.total)}</div>
              <div className="text-[0.62rem] opacity-70">visit total</div>
            </div>
          </div>

          <div className="mt-2 space-y-2">
            {[...job.bodies.entries()].map(([bodyName, rows]) => {
              const bodyTotal = rows.reduce((s, r) => s + r.cost, 0);
              return (
                <div key={bodyName} className="ss-card bg-white/50 p-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <Chip tone="aqua">
                      <FlaskConical size={9} /> {bodyName}
                    </Chip>
                    <span className="ss-num text-[0.8rem] font-semibold">{money2(bodyTotal)}</span>
                  </div>
                  <table className="mt-1.5 w-full text-[0.76rem]">
                    <tbody>
                      {rows.map((r, i) => (
                        <tr key={`${r.product}-${i}`} className="border-t border-black/5">
                          <td className="py-1">{r.product}</td>
                          <td className="py-1 text-right ss-num opacity-75">
                            {Math.round(r.qty * 100) / 100} {r.unit}
                          </td>
                          <td className="py-1 text-right ss-num opacity-60">{money2(r.costPerUnit)}/{r.unit}</td>
                          <td className="py-1 text-right ss-num">{money2(r.cost)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
