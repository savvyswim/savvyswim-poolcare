import { useMemo, useState } from "react";
import { toast } from "sonner";
import { DollarSign, FileText, Lock, Printer, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Chip, EmptyState, SectionTitle, StatTile } from "@/crm/components/Brand";
import { useSavvyIdentity, useTable } from "@/crm/lib/useSavvy";
import {
  buildPayLines,
  DEFAULT_PAY_CONFIG,
  isoDay,
  money,
  PAY_SETTINGS_KEY,
  sumLines,
  weekRange,
  type PayConfig,
  type PayLine,
  type PayVisit,
} from "@/crm/lib/payPerPool";

type Staff = { id: string; full_name: string; level: string };
type Payout = {
  id: string;
  tech_id: string;
  invoice_number: string;
  period_start: string;
  period_end: string;
  pools_count: number;
  base_pay: number;
  bonus_pay: number;
  commission_pay: number;
  adjustments: number;
  total_pay: number;
  status: string;
  notes: string | null;
  paid_at: string | null;
};

type PoolRate = {
  id: string;
  full_name: string;
  city: string | null;
  monthly_price: number | null;
  route_frequency: string | null;
  tech_pay_rate: number | null;
  tech_upsell_pct: number | null;
};

type Tab = "earnings" | "rates" | "payouts";

export default function PayPerPool() {
  const id = useSavvyIdentity();
  const canManage = id.isOffice;
  const today = isoDay(new Date());
  const thisWeek = weekRange(new Date());

  const [tab, setTab] = useState<Tab>("earnings");
  const [from, setFrom] = useState(thisWeek.start);
  const [to, setTo] = useState(thisWeek.end);
  const [techFilter, setTechFilter] = useState<string>("all");
  const [busy, setBusy] = useState(false);

  /* ---------------------------------------------------------------- config */
  const { rows: settingRows, refetch: reloadSettings } = useTable<{ key: string; value: PayConfig }>(
    "pay-settings",
    async () => {
      const { data } = await supabase.from("ss_settings").select("key,value").eq("key", PAY_SETTINGS_KEY);
      return (data ?? []) as unknown as { key: string; value: PayConfig }[];
    },
  );
  const saved = settingRows[0]?.value;
  const cfg: PayConfig = { ...DEFAULT_PAY_CONFIG, ...(saved ?? {}) };
  const [cfgDraft, setCfgDraft] = useState<Partial<PayConfig>>({});
  const liveCfg: PayConfig = { ...cfg, ...cfgDraft };

  async function saveConfig() {
    setBusy(true);
    const { error } = await supabase
      .from("ss_settings")
      .upsert({ key: PAY_SETTINGS_KEY, value: liveCfg as never }, { onConflict: "key" });
    setBusy(false);
    if (error) return toast.error(error.message);
    setCfgDraft({});
    void reloadSettings();
    toast.success("Pay rules saved");
  }

  /* ----------------------------------------------------------------- data */
  const { rows: staff } = useTable<Staff>("pay-staff", async () => {
    const { data } = await supabase
      .from("ss_staff").select("id,full_name,level").eq("is_active", true).order("full_name");
    return (data ?? []) as Staff[];
  });

  const { rows: visits, loading, refetch: reloadVisits } = useTable<PayVisit>(
    "pay-visits",
    async () => {
      let q = supabase
        .from("ss_visits")
        .select(
          "id,scheduled_date,tech_id,status,completed_at,chem_cost,tech_pay,tech_bonus,upsell_amount,upsell_commission,pay_status,payout_id," +
            "ss_customers(id,full_name,city,monthly_price,route_frequency,tech_pay_rate,tech_upsell_pct)",
        )
        .eq("status", "completed")
        .gte("scheduled_date", from)
        .lte("scheduled_date", to)
        .order("scheduled_date", { ascending: false })
        .limit(1000);
      if (!canManage && id.staffId) q = q.eq("tech_id", id.staffId);
      const { data } = await q;
      return (data ?? []) as unknown as PayVisit[];
    },
    [from, to, canManage, id.staffId],
  );

  const { rows: payouts, refetch: reloadPayouts } = useTable<Payout>(
    "pay-payouts",
    async () => {
      let q = supabase.from("ss_tech_payouts").select("*").order("period_end", { ascending: false }).limit(100);
      if (!canManage && id.staffId) q = q.eq("tech_id", id.staffId);
      const { data } = await q;
      return (data ?? []) as Payout[];
    },
    [canManage, id.staffId],
  );

  const { rows: pools, refetch: reloadPools } = useTable<PoolRate>(
    "pay-pools",
    async () => {
      if (!canManage) return [];
      const { data } = await supabase
        .from("ss_customers")
        .select("id,full_name,city,monthly_price,route_frequency,tech_pay_rate,tech_upsell_pct")
        .eq("status", "active")
        .order("full_name");
      return (data ?? []) as PoolRate[];
    },
    [canManage],
  );

  /* -------------------------------------------------------------- compute */
  const levelByTech = useMemo(
    () => Object.fromEntries(staff.map((s) => [s.id, s.level])),
    [staff],
  );

  const lines = useMemo(() => {
    const scoped = techFilter === "all" ? visits : visits.filter((v) => v.tech_id === techFilter);
    return buildPayLines(scoped, liveCfg, levelByTech);
  }, [visits, techFilter, liveCfg, levelByTech]);

  const totals = useMemo(() => sumLines(lines), [lines]);
  const todayLines = useMemo(() => lines.filter((l) => l.date === today), [lines, today]);
  const todayTotals = useMemo(() => sumLines(todayLines), [todayLines]);

  const byTech = useMemo(() => {
    const map = new Map<string, PayLine[]>();
    for (const l of lines) {
      const key = l.techId ?? "unassigned";
      map.set(key, [...(map.get(key) ?? []), l]);
    }
    return [...map.entries()].map(([techId, ls]) => ({
      techId,
      name: staff.find((s) => s.id === techId)?.full_name ?? "Unassigned",
      lines: ls,
      totals: sumLines(ls),
    })).sort((a, b) => b.totals.techTotal - a.totals.techTotal);
  }, [lines, staff]);

  const byDay = useMemo(() => {
    const map = new Map<string, PayLine[]>();
    for (const l of lines) map.set(l.date, [...(map.get(l.date) ?? []), l]);
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [lines]);

  /* --------------------------------------------------------------- actions */
  async function savePoolRate(poolId: string, patch: Partial<PoolRate>) {
    const { error } = await supabase.from("ss_customers").update(patch).eq("id", poolId);
    if (error) return toast.error(error.message);
    void reloadPools();
    void reloadVisits();
    toast.success("Pool pay rate saved");
  }

  // Upsell totals are derived from the invoice line items marked as upsells,
  // so there is nothing to type in here — the ledger is the source of truth.


  async function generateInvoice(techId: string) {
    const group = byTech.find((g) => g.techId === techId);
    if (!group) return;
    const open = group.lines.filter((l) => !l.locked);
    if (!open.length) return toast.error("No unpaid pools in this period");
    setBusy(true);
    const t = sumLines(open);
    const { data, error } = await supabase
      .from("ss_tech_payouts")
      .insert({
        tech_id: techId,
        period_start: from,
        period_end: to,
        pools_count: t.pools,
        base_pay: Number(t.basePay.toFixed(2)),
        bonus_pay: Number(t.bonus.toFixed(2)),
        commission_pay: Number(t.commission.toFixed(2)),
        total_pay: Number(t.techTotal.toFixed(2)),
        status: "ready",
      })
      .select()
      .single();
    if (error || !data) {
      setBusy(false);
      return toast.error(error?.message ?? "Could not create invoice");
    }
    // Freeze each visit's pay so later rate edits never rewrite history.
    for (const l of open) {
      await supabase
        .from("ss_visits")
        .update({
          tech_pay: l.basePay,
          tech_bonus: l.bonus,
          upsell_commission: l.commission,
          pay_status: "invoiced",
          payout_id: data.id,
        })
        .eq("id", l.visitId);
    }
    setBusy(false);
    void reloadVisits();
    void reloadPayouts();
    setTab("payouts");
    toast.success(`Invoice ${data.invoice_number} ready — ${money(t.techTotal)}`);
  }

  async function markPaid(p: Payout) {
    const { error } = await supabase
      .from("ss_tech_payouts")
      .update({ status: "paid", paid_at: new Date().toISOString() })
      .eq("id", p.id);
    if (error) return toast.error(error.message);
    await supabase.from("ss_visits").update({ pay_status: "paid" }).eq("payout_id", p.id);
    void reloadPayouts();
    void reloadVisits();
    toast.success(`${p.invoice_number} marked paid`);
  }

  /* ------------------------------------------------------------------ view */
  const num = (v: number | null | undefined) => (v == null ? "" : String(v));

  return (
    <div className="space-y-6 print:space-y-4">
      <SectionTitle
        title={canManage ? "Pay Per Pool" : "My Pay"}
        sub={
          canManage
            ? "Set what each pool pays the tech, watch the day add up, and see what the company keeps after pay, chems, bonus and commission."
            : "Every completed pool adds to your day. Your invoice is ready when the period closes."
        }
      />

      {/* period + filters */}
      <div className="ss-card flex flex-wrap items-end gap-3 p-4 print:hidden">
        <label className="text-[0.7rem] uppercase tracking-[0.14em] opacity-60">
          From
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="ss-input mt-1 block" />
        </label>
        <label className="text-[0.7rem] uppercase tracking-[0.14em] opacity-60">
          To
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="ss-input mt-1 block" />
        </label>
        <div className="flex gap-2">
          <button className="ss-btn-ghost" onClick={() => { setFrom(today); setTo(today); }}>Today</button>
          <button className="ss-btn-ghost" onClick={() => { const w = weekRange(new Date()); setFrom(w.start); setTo(w.end); }}>
            This week
          </button>
          <button
            className="ss-btn-ghost"
            onClick={() => {
              const d = new Date();
              setFrom(isoDay(new Date(d.getFullYear(), d.getMonth(), 1)));
              setTo(isoDay(new Date(d.getFullYear(), d.getMonth() + 1, 0)));
            }}
          >
            This month
          </button>
        </div>
        {canManage && (
          <label className="text-[0.7rem] uppercase tracking-[0.14em] opacity-60">
            Tech
            <select value={techFilter} onChange={(e) => setTechFilter(e.target.value)} className="ss-input mt-1 block">
              <option value="all">All techs</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>{s.full_name}</option>
              ))}
            </select>
          </label>
        )}
      </div>

      {/* headline tiles */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Pools completed" value={String(totals.pools)} />
        <StatTile label={canManage ? "Tech pay (period)" : "You earned"} value={money(totals.techTotal)} />
        <StatTile label="Today so far" value={money(todayTotals.techTotal)} />
        {canManage ? (
          <StatTile label="Company keeps" value={money(totals.companyKeeps)} />
        ) : (
          <StatTile label="Pools today" value={String(todayTotals.pools)} />
        )}
      </div>

      {canManage && (
        <div className="ss-card p-4">
          <div className="text-[0.7rem] uppercase tracking-[0.18em] opacity-60">Finance view — period</div>
          <div className="mt-3 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {[
              ["Service revenue", money(totals.revenue)],
              ["Tech base pay", `- ${money(totals.basePay)}`],
              ["Bonuses", `- ${money(totals.bonus)}`],
              ["Upsell commission", `- ${money(totals.commission)}`],
              ["Chemicals", `- ${money(totals.chemCost)}`],
              ["Company keeps", `${money(totals.companyKeeps)} · ${totals.marginPct.toFixed(0)}%`],
            ].map(([k, v]) => (
              <div key={k} className="rounded-lg border border-black/10 p-3">
                <div className="text-[0.65rem] uppercase tracking-[0.14em] opacity-55">{k}</div>
                <div className="mt-1 text-[0.95rem] font-semibold">{v}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* tabs */}
      <div className="flex flex-wrap gap-2 print:hidden">
        {([
          ["earnings", "Earnings"],
          ...(canManage ? ([["rates", "Pool pay rates"]] as [Tab, string][]) : []),
          ["payouts", "Invoices"],
        ] as [Tab, string][]).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={tab === k ? "ss-btn" : "ss-btn-ghost"}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ------------------------------------------------------- EARNINGS */}
      {tab === "earnings" && (
        <div className="space-y-5">
          {canManage && (
            <div className="ss-card p-4 print:hidden">
              <div className="text-[0.7rem] uppercase tracking-[0.18em] opacity-60">Pay rules</div>
              <div className="mt-3 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {([
                  ["default_rate", "Pay per pool"],
                  ["contractor_rate", "Contractor rate"],
                  ["bonus_threshold", "Bonus at (pools/day)"],
                  ["bonus_amount", "Daily bonus"],
                  ["upsell_pct", "Upsell commission %"],
                  ["default_chem_cost", "Chem cost / visit"],
                ] as [keyof PayConfig, string][]).map(([k, label]) => (
                  <label key={k} className="text-[0.65rem] uppercase tracking-[0.14em] opacity-60">
                    {label}
                    <input
                      type="number"
                      step="0.5"
                      className="ss-input mt-1 block w-full"
                      value={liveCfg[k]}
                      onChange={(e) => setCfgDraft((d) => ({ ...d, [k]: Number(e.target.value) }))}
                    />
                  </label>
                ))}
              </div>
              {Object.keys(cfgDraft).length > 0 && (
                <div className="mt-3 flex gap-2">
                  <button className="ss-btn" disabled={busy} onClick={saveConfig}>Save pay rules</button>
                  <button className="ss-btn-ghost" onClick={() => setCfgDraft({})}>Cancel</button>
                </div>
              )}
            </div>
          )}

          {canManage && byTech.length > 0 && (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {byTech.map((g) => (
                <div key={g.techId} className="ss-card p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="text-[0.95rem] font-semibold">{g.name}</div>
                      <div className="text-[0.7rem] opacity-60">
                        {g.totals.pools} pools · {money(g.totals.techTotal)} owed
                      </div>
                    </div>
                    <Chip tone={g.totals.marginPct >= 45 ? "green" : "orange"}>
                      {g.totals.marginPct.toFixed(0)}% margin
                    </Chip>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-[0.72rem]">
                    <div><span className="opacity-55">Base</span><br />{money(g.totals.basePay)}</div>
                    <div><span className="opacity-55">Bonus</span><br />{money(g.totals.bonus)}</div>
                    <div><span className="opacity-55">Comm.</span><br />{money(g.totals.commission)}</div>
                  </div>
                  {g.techId !== "unassigned" && (
                    <button
                      className="ss-btn mt-3 w-full"
                      disabled={busy}
                      onClick={() => generateInvoice(g.techId)}
                    >
                      <FileText className="mr-2 inline h-4 w-4" />
                      Build invoice
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {loading ? (
            <EmptyState>Loading completed pools…</EmptyState>
          ) : lines.length === 0 ? (
            <EmptyState>No completed pools in this period yet.</EmptyState>
          ) : (
            byDay.map(([day, dayLines]) => {
              const t = sumLines(dayLines);
              return (
                <div key={day} className="ss-card overflow-hidden">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-black/10 px-4 py-3">
                    <div className="text-[0.8rem] font-semibold uppercase tracking-[0.12em]">
                      {new Date(`${day}T12:00:00`).toLocaleDateString("en-US", {
                        weekday: "short", month: "short", day: "numeric",
                      })}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-[0.75rem]">
                      <span className="opacity-60">{t.pools} pools</span>
                      <span className="font-semibold">
                        <Wallet className="mr-1 inline h-3.5 w-3.5" />
                        {money(t.techTotal)}
                      </span>
                      {canManage && (
                        <span className="opacity-70">
                          <DollarSign className="mr-1 inline h-3.5 w-3.5" />
                          keeps {money(t.companyKeeps)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-[0.78rem]">
                      <thead className="text-left opacity-55">
                        <tr>
                          <th className="px-4 py-2">Pool</th>
                          {canManage && <th className="px-3 py-2">Tech</th>}
                          <th className="px-3 py-2">Base</th>
                          <th className="px-3 py-2">Bonus</th>
                          <th className="px-3 py-2">Upsell</th>
                          <th className="px-3 py-2">Comm.</th>
                          <th className="px-3 py-2">Tech gets</th>
                          {canManage && <th className="px-3 py-2">Chems</th>}
                          {canManage && <th className="px-3 py-2">Company keeps</th>}
                          <th className="px-3 py-2">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dayLines.map((l) => (
                          <tr key={l.visitId} className="border-t border-black/5">
                            <td className="px-4 py-2">
                              <div className="font-medium">{l.customerName}</div>
                              <div className="text-[0.68rem] opacity-55">{l.city ?? "—"}</div>
                            </td>
                            {canManage && (
                              <td className="px-3 py-2 opacity-75">
                                {staff.find((s) => s.id === l.techId)?.full_name ?? "—"}
                              </td>
                            )}
                            <td className="px-3 py-2">{money(l.basePay)}</td>
                            <td className="px-3 py-2">{l.bonus ? money(l.bonus) : "—"}</td>
                            <td className="px-3 py-2" title="From the upsell lines on this visit's invoice">
                              {l.upsellAmount ? money(l.upsellAmount) : "—"}
                            </td>

                            <td className="px-3 py-2">{l.commission ? money(l.commission) : "—"}</td>
                            <td className="px-3 py-2 font-semibold">{money(l.techTotal)}</td>
                            {canManage && <td className="px-3 py-2 opacity-70">{money(l.chemCost)}</td>}
                            {canManage && (
                              <td className={`px-3 py-2 font-medium ${l.companyKeeps < 0 ? "text-red-600" : ""}`}>
                                {money(l.companyKeeps)}
                              </td>
                            )}
                            <td className="px-3 py-2">
                              <Chip tone={l.payStatus === "paid" ? "green" : l.payStatus === "invoiced" ? "aqua" : "orange"}>
                                {l.locked && <Lock className="mr-1 inline h-3 w-3" />}
                                {l.payStatus}
                              </Chip>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ---------------------------------------------------------- RATES */}
      {tab === "rates" && canManage && (
        <div className="ss-card overflow-x-auto">
          <table className="w-full text-[0.78rem]">
            <thead className="text-left opacity-55">
              <tr>
                <th className="px-4 py-2">Pool</th>
                <th className="px-3 py-2">City</th>
                <th className="px-3 py-2">Customer pays / mo</th>
                <th className="px-3 py-2">Tech pay per visit</th>
                <th className="px-3 py-2">Upsell %</th>
              </tr>
            </thead>
            <tbody>
              {pools.map((p) => (
                <tr key={p.id} className="border-t border-black/5">
                  <td className="px-4 py-2 font-medium">{p.full_name}</td>
                  <td className="px-3 py-2 opacity-70">{p.city ?? "—"}</td>
                  <td className="px-3 py-2 opacity-70">{p.monthly_price ? money(Number(p.monthly_price)) : "—"}</td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      step="0.5"
                      className="ss-input w-24"
                      placeholder={String(cfg.default_rate)}
                      defaultValue={num(p.tech_pay_rate)}
                      onBlur={(e) => {
                        const v = e.target.value === "" ? null : Number(e.target.value);
                        if (v !== p.tech_pay_rate) void savePoolRate(p.id, { tech_pay_rate: v });
                      }}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      step="1"
                      className="ss-input w-20"
                      placeholder={String(cfg.upsell_pct)}
                      defaultValue={num(p.tech_upsell_pct)}
                      onBlur={(e) => {
                        const v = e.target.value === "" ? null : Number(e.target.value);
                        if (v !== p.tech_upsell_pct) void savePoolRate(p.id, { tech_upsell_pct: v });
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {pools.length === 0 && <EmptyState>No active pools yet.</EmptyState>}
        </div>
      )}

      {/* -------------------------------------------------------- PAYOUTS */}
      {tab === "payouts" && (
        <div className="space-y-3">
          {payouts.length === 0 && <EmptyState>No pay invoices yet.</EmptyState>}
          {payouts.map((p) => (
            <div key={p.id} className="ss-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-[0.95rem] font-semibold">{p.invoice_number}</div>
                  <div className="text-[0.72rem] opacity-60">
                    {staff.find((s) => s.id === p.tech_id)?.full_name ?? "Technician"} ·{" "}
                    {p.period_start} → {p.period_end} · {p.pools_count} pools
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[1.15rem] font-semibold">{money(Number(p.total_pay))}</div>
                  <Chip tone={p.status === "paid" ? "green" : "aqua"}>{p.status}</Chip>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-[0.75rem] sm:grid-cols-4">
                <div><span className="opacity-55">Base</span><br />{money(Number(p.base_pay))}</div>
                <div><span className="opacity-55">Bonus</span><br />{money(Number(p.bonus_pay))}</div>
                <div><span className="opacity-55">Commission</span><br />{money(Number(p.commission_pay))}</div>
                <div><span className="opacity-55">Paid</span><br />{p.paid_at ? new Date(p.paid_at).toLocaleDateString() : "—"}</div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 print:hidden">
                <button className="ss-btn-ghost" onClick={() => window.print()}>
                  <Printer className="mr-2 inline h-4 w-4" />
                  Print invoice
                </button>
                {canManage && p.status !== "paid" && (
                  <button className="ss-btn" onClick={() => markPaid(p)}>Mark paid</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
