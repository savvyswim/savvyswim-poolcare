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
  periodHistory,
  sumLines,
  weekRange,
  type PayConfig,
  type PayLine,
  type PayVisit,
} from "@/crm/lib/payPerPool";

type Staff = {
  id: string;
  full_name: string;
  level: string;
  pay_rate: number | null;
  upsell_pct: number | null;
};
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

type Adjustment = {
  id: string;
  tech_id: string;
  effective_date: string;
  kind: string;
  amount: number;
  reason: string | null;
  payout_id: string | null;
};

type PoolRate = {
  id: string;
  full_name: string;
  city: string | null;
  monthly_price: number | null;
  route_frequency: string | null;
  tech_pay_rate: number | null;
  tech_upsell_pct: number | null;
  assigned_tech_id: string | null;
};

type Tab = "earnings" | "rates" | "team" | "payouts";

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
    if (error) { toast.error(error.message); return; }
    setCfgDraft({});
    void reloadSettings();
    toast.success("Pay rules saved");
  }

  /* ----------------------------------------------------------------- data */
  const { rows: staff, refetch: reloadStaff } = useTable<Staff>("pay-staff", async () => {
    const { data } = await supabase
      .from("ss_staff")
      .select("id,full_name,level,pay_rate,upsell_pct")
      .eq("is_active", true)
      .order("full_name");
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

  const { rows: adjustments, refetch: reloadAdjustments } = useTable<Adjustment>(
    "pay-adjustments",
    async () => {
      let q = supabase
        .from("ss_tech_adjustments")
        .select("*")
        .gte("effective_date", from)
        .lte("effective_date", to)
        .order("effective_date", { ascending: false });
      if (!canManage && id.staffId) q = q.eq("tech_id", id.staffId);
      const { data } = await q;
      return (data ?? []) as Adjustment[];
    },
    [from, to, canManage, id.staffId],
  );

  const { rows: pools, refetch: reloadPools } = useTable<PoolRate>(
    "pay-pools",
    async () => {
      let q = supabase
        .from("ss_customers")
        .select("id,full_name,city,monthly_price,route_frequency,tech_pay_rate,tech_upsell_pct,assigned_tech_id")
        .eq("status", "active")
        .order("full_name");
      if (!canManage && id.staffId) q = q.eq("assigned_tech_id", id.staffId);
      const { data } = await q;
      return (data ?? []) as PoolRate[];
    },
    [canManage, id.staffId],
  );

  /* -------------------------------------------------------------- compute */
  const techMeta = useMemo(
    () =>
      Object.fromEntries(
        staff.map((s) => [s.id, { level: s.level, pay_rate: s.pay_rate, upsell_pct: s.upsell_pct }]),
      ),
    [staff],
  );

  const lines = useMemo(() => {
    const scoped = techFilter === "all" ? visits : visits.filter((v) => v.tech_id === techFilter);
    return buildPayLines(scoped, liveCfg, techMeta);
  }, [visits, techFilter, liveCfg, techMeta]);

  /* -------------------------------------------------- tech "my pool" view */
  const [openPool, setOpenPool] = useState<string | null>(null);
  const [showBonus, setShowBonus] = useState(false);
  const myMeta = useMemo(() => staff.find((s) => s.id === id.staffId), [staff, id.staffId]);

  function poolRateForMe(p: PoolRate) {
    return Number(
      p.tech_pay_rate ??
        myMeta?.pay_rate ??
        (myMeta?.level === "contractor" ? liveCfg.contractor_rate : liveCfg.default_rate),
    );
  }
  function poolPctForMe(p: PoolRate) {
    return Number(p.tech_upsell_pct ?? myMeta?.upsell_pct ?? liveCfg.upsell_pct);
  }

  const openPoolRow = useMemo(() => pools.find((p) => p.id === openPool) ?? null, [pools, openPool]);
  const openPoolLines = useMemo(
    () => (openPool ? lines.filter((l) => l.customerId === openPool) : []),
    [lines, openPool],
  );

  /* ------------------------------------- pool-by-pool earnings history */
  const historySince = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 180);
    return isoDay(d);
  }, []);

  const { rows: historyVisits, loading: historyLoading } = useTable<PayVisit>(
    "pay-pool-history",
    async () => {
      if (!openPool) return [];
      let q = supabase
        .from("ss_visits")
        .select(
          "id,scheduled_date,tech_id,status,completed_at,chem_cost,tech_pay,tech_bonus,upsell_amount,upsell_commission,pay_status,payout_id," +
            "ss_customers(id,full_name,city,monthly_price,route_frequency,tech_pay_rate,tech_upsell_pct)",
        )
        .eq("status", "completed")
        .eq("customer_id", openPool)
        .gte("scheduled_date", historySince)
        .order("scheduled_date", { ascending: false })
        .limit(500);
      if (!canManage && id.staffId) q = q.eq("tech_id", id.staffId);
      const { data } = await q;
      return (data ?? []) as unknown as PayVisit[];
    },
    [openPool, historySince, canManage, id.staffId],
  );

  const poolHistory = useMemo(
    () => periodHistory(buildPayLines(historyVisits, liveCfg, techMeta)),
    [historyVisits, liveCfg, techMeta],
  );


  const adjByTech = useMemo(() => {
    const map = new Map<string, number>();
    const scoped = techFilter === "all" ? adjustments : adjustments.filter((a) => a.tech_id === techFilter);
    for (const a of scoped) map.set(a.tech_id, (map.get(a.tech_id) ?? 0) + Number(a.amount));
    return map;
  }, [adjustments, techFilter]);

  const adjTotal = useMemo(
    () => [...adjByTech.values()].reduce((s, n) => s + n, 0),
    [adjByTech],
  );

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
    const { error } = await supabase.from("ss_customers").update(patch as never).eq("id", poolId);
    if (error) { toast.error(error.message); return; }
    void reloadPools();
    void reloadVisits();
    toast.success("Pool pay rate saved");
  }

  // Upsell totals are derived from the invoice line items marked as upsells,
  // so there is nothing to type in here — the ledger is the source of truth.


  async function saveStaffPay(staffId: string, patch: Partial<Staff>) {
    const { error } = await supabase.from("ss_staff").update(patch as never).eq("id", staffId);
    if (error) { toast.error(error.message); return; }
    void reloadStaff();
    void reloadVisits();
    toast.success("Tech pay defaults saved");
  }

  async function addAdjustment(techId: string, kind: string, amount: number, reason: string) {
    if (!amount) { toast.error("Enter an amount"); return; }
    const { error } = await supabase.from("ss_tech_adjustments").insert({
      tech_id: techId,
      kind,
      amount,
      reason: reason.trim() || null,
      effective_date: today,
    });
    if (error) { toast.error(error.message); return; }
    void reloadAdjustments();
    toast.success(kind === "bonus" ? "Bonus added" : "Commission adjustment added");
  }

  async function removeAdjustment(a: Adjustment) {
    if (a.payout_id) { toast.error("Already on a paid invoice"); return; }
    const { error } = await supabase.from("ss_tech_adjustments").delete().eq("id", a.id);
    if (error) { toast.error(error.message); return; }
    void reloadAdjustments();
  }

  async function generateInvoice(techId: string) {
    const group = byTech.find((g) => g.techId === techId);
    if (!group) return;
    const open = group.lines.filter((l) => !l.locked);
    const openAdj = adjustments.filter((a) => a.tech_id === techId && !a.payout_id);
    const adjSum = openAdj.reduce((s, a) => s + Number(a.amount), 0);
    if (!open.length && !adjSum) { toast.error("No unpaid pools in this period"); return; }
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
        adjustments: Number(adjSum.toFixed(2)),
        total_pay: Number((t.techTotal + adjSum).toFixed(2)),
        status: "ready",
      })
      .select()
      .single();
    if (error || !data) {
      setBusy(false);
      { toast.error(error?.message ?? "Could not create invoice"); return; }
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
    if (openAdj.length) {
      await supabase
        .from("ss_tech_adjustments")
        .update({ payout_id: data.id })
        .in("id", openAdj.map((a) => a.id));
    }
    setBusy(false);
    void reloadVisits();
    void reloadPayouts();
    void reloadAdjustments();
    setTab("payouts");
    toast.success(`Invoice ${data.invoice_number} ready — ${money(t.techTotal + adjSum)}`);
  }

  async function markPaid(p: Payout) {
    const { error } = await supabase
      .from("ss_tech_payouts")
      .update({ status: "paid", paid_at: new Date().toISOString() })
      .eq("id", p.id);
    if (error) { toast.error(error.message); return; }
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
        title={canManage ? "Payroll" : "My Pay"}
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
        <StatTile
          label={canManage ? "Tech pay (period)" : "You earned"}
          value={money(totals.techTotal + adjTotal)}
        />
        <StatTile label="Today so far" value={money(todayTotals.techTotal)} />
        {canManage ? (
          <StatTile label="Company keeps" value={money(totals.companyKeeps - adjTotal)} />
        ) : (
          <StatTile label="Pools today" value={String(todayTotals.pools)} />
        )}
      </div>

      {canManage && (
        <div className="ss-card p-4">
          <div className="text-[0.7rem] uppercase tracking-[0.18em] opacity-60">Finance view — period</div>
          <div className="mt-3 grid gap-3 grid-cols-2 sm:grid-cols-3 xl:grid-cols-7">
            {[
              ["Service revenue", money(totals.revenue)],
              ["Tech base pay", `- ${money(totals.basePay)}`],
              ["Bonuses", `- ${money(totals.bonus)}`],
              ["Extra bonus / adj.", `- ${money(adjTotal)}`],
              ["Upsell commission", `- ${money(totals.commission)}`],
              ["Chemicals", `- ${money(totals.chemCost)}`],
              [
                "Company keeps",
                `${money(totals.companyKeeps - adjTotal)} · ${totals.marginPct.toFixed(0)}%`,
              ],
            ].map(([k, v]) => (
              <div key={k} className="min-w-0 border border-black/10 p-3">
                <div className="truncate text-[0.65rem] uppercase tracking-[0.14em] opacity-55" title={k}>{k}</div>
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
          ["rates", canManage ? "Pool pay rates" : "My pools"],
          ...(canManage ? ([["team", "Tech bonuses"]] as [Tab, string][]) : []),
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
              {byTech.map((g) => {
                const extra = adjByTech.get(g.techId) ?? 0;
                return (
                  <div key={g.techId} className="ss-card p-4">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-[0.95rem] font-semibold">{g.name}</div>
                        <div className="text-[0.7rem] opacity-60">
                          {g.totals.pools} pools · {money(g.totals.techTotal + extra)} owed
                        </div>
                      </div>
                      <Chip tone={g.totals.marginPct >= 45 ? "green" : "orange"}>
                        {g.totals.marginPct.toFixed(0)}% margin
                      </Chip>
                    </div>
                    <div className="mt-3 grid grid-cols-4 gap-2 text-[0.72rem]">
                      <div><span className="opacity-55">Base</span><br />{money(g.totals.basePay)}</div>
                      <div><span className="opacity-55">Bonus</span><br />{money(g.totals.bonus)}</div>
                      <div><span className="opacity-55">Comm.</span><br />{money(g.totals.commission)}</div>
                      <div><span className="opacity-55">Extra</span><br />{money(extra)}</div>
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
                );
              })}
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
                <th className="px-3 py-2">Assigned tech</th>
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
                  <td className="px-3 py-2 opacity-70">
                    {staff.find((s) => s.id === p.assigned_tech_id)?.full_name ?? "—"}
                  </td>
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

      {/* ------------------------------------------------- MY POOLS (tech) */}
      {tab === "rates" && !canManage && (
        <div className="space-y-3">
          <p className="text-[0.75rem] opacity-60">
            Every pool assigned to you and exactly what it pays you per visit. Tap a pool for the
            full breakdown.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {pools.map((p) => {
              const rate = poolRateForMe(p);
              const pct = poolPctForMe(p);
              const done = lines.filter((l) => l.customerId === p.id);
              return (
                <button
                  key={p.id}
                  className="ss-card p-4 text-left transition-shadow hover:shadow-[0_10px_24px_-16px_rgba(0,0,0,.5)]"
                  onClick={() => { setOpenPool(p.id); setShowBonus(false); }}
                >
                  <div className="text-[0.9rem] font-semibold">{p.full_name}</div>
                  <div className="text-[0.7rem] opacity-55">{p.city ?? "—"}</div>
                  <div className="mt-3 flex items-end justify-between">
                    <div>
                      <div className="text-[0.62rem] uppercase tracking-[0.14em] opacity-55">You get / visit</div>
                      <div className="text-[1.2rem] font-semibold">{money(rate)}</div>
                    </div>
                    <Chip tone="aqua">{pct}% upsell</Chip>
                  </div>
                  <div className="mt-2 text-[0.68rem] opacity-55">
                    {done.length} completed this period · {money(done.reduce((s, l) => s + l.techTotal, 0))} earned
                  </div>
                </button>
              );
            })}
          </div>
          {pools.length === 0 && <EmptyState>No pools assigned to you yet.</EmptyState>}
        </div>
      )}

      {/* ------------------------------------------- MY POOL DETAIL (tech) */}
      {openPoolRow && (
        <div className="ss-modal-backdrop" onClick={() => setOpenPool(null)}>
          <div className="ss-modal" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-[1rem]">{openPoolRow.full_name}</h2>
                <div className="text-[0.72rem] opacity-55">
                  {openPoolRow.city ?? "—"}
                </div>
              </div>
              <button className="ss-btn-ghost ss-btn" onClick={() => setOpenPool(null)}>Close</button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="ss-card p-3">
                <div className="text-[0.6rem] uppercase tracking-[0.14em] opacity-55">You get / visit</div>
                <div className="mt-1 text-[1.35rem] font-semibold">{money(poolRateForMe(openPoolRow))}</div>
              </div>
              <div className="ss-card p-3">
                <div className="text-[0.6rem] uppercase tracking-[0.14em] opacity-55">Upsell commission</div>
                <div className="mt-1 text-[1.35rem] font-semibold">{poolPctForMe(openPoolRow)}%</div>
              </div>
              <div className="ss-card p-3">
                <div className="text-[0.6rem] uppercase tracking-[0.14em] opacity-55">Visits this period</div>
                <div className="mt-1 text-[1.35rem] font-semibold">{openPoolLines.length}</div>
              </div>
              <div className="ss-card p-3">
                <div className="text-[0.6rem] uppercase tracking-[0.14em] opacity-55">Earned this period</div>
                <div className="mt-1 text-[1.35rem] font-semibold">
                  {money(openPoolLines.reduce((s, l) => s + l.techTotal, 0))}
                </div>
              </div>
            </div>

            {/* Bonus stays hidden until asked for — the office sets it, the tech confirms it. */}
            <div className="mt-4">
              {showBonus ? (
                <div className="ss-card p-3">
                  <div className="text-[0.6rem] uppercase tracking-[0.14em] opacity-55">Bonus & commission</div>
                  <ul className="mt-2 space-y-1 text-[0.78rem]">
                    <li className="flex justify-between">
                      <span>Base pay ({openPoolLines.length} visits)</span>
                      <strong>{money(openPoolLines.reduce((s, l) => s + l.basePay, 0))}</strong>
                    </li>
                    <li className="flex justify-between">
                      <span>Daily bonus earned here</span>
                      <strong>{money(openPoolLines.reduce((s, l) => s + l.bonus, 0))}</strong>
                    </li>
                    <li className="flex justify-between">
                      <span>Upsell commission</span>
                      <strong>{money(openPoolLines.reduce((s, l) => s + l.commission, 0))}</strong>
                    </li>
                    <li className="flex justify-between border-t border-black/10 pt-1">
                      <span>Total from this pool</span>
                      <strong>{money(openPoolLines.reduce((s, l) => s + l.techTotal, 0))}</strong>
                    </li>
                  </ul>
                  <p className="mt-2 text-[0.68rem] opacity-55">
                    Bonuses and rate changes are set by the office.
                  </p>
                </div>
              ) : (
                <button className="ss-btn w-full" onClick={() => setShowBonus(true)}>
                  <DollarSign className="mr-2 inline h-4 w-4" />
                  Show bonus &amp; commission
                </button>
              )}
            </div>

            {openPoolLines.length > 0 && (
              <div className="mt-4">
                <div className="text-[0.6rem] uppercase tracking-[0.14em] opacity-55">Visits</div>
                <ul className="mt-2 space-y-1 text-[0.76rem]">
                  {openPoolLines.map((l) => (
                    <li key={l.visitId} className="flex items-center justify-between border-t border-black/5 pt-1">
                      <span>{l.date}</span>
                      <span className="flex items-center gap-2">
                        <strong>{money(l.techTotal)}</strong>
                        {l.locked && <Lock size={12} className="opacity-45" />}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Earnings history — every pay period this pool has paid out */}
            <div className="mt-5">
              <div className="text-[0.6rem] uppercase tracking-[0.14em] opacity-55">
                Earnings history · last 6 months
              </div>
              {historyLoading ? (
                <p className="mt-2 text-[0.75rem] opacity-55">Loading history…</p>
              ) : poolHistory.length === 0 ? (
                <p className="mt-2 text-[0.75rem] opacity-55">No completed visits yet at this pool.</p>
              ) : (
                <ol className="ss-timeline mt-3 space-y-2">
                  {poolHistory.map((p) => (
                    <li key={p.start} className="relative ss-card p-3">
                      <span className="ss-timeline-dot" />
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <div className="text-[0.78rem] font-semibold">
                          {new Date(`${p.start}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                          {" – "}
                          {new Date(`${p.end}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                        </div>
                        <div className="flex items-center gap-2">
                          <strong className="text-[0.95rem]">{money(p.total)}</strong>
                          {p.locked && <Lock size={12} className="opacity-45" />}
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        <Chip tone="ink">{p.visits} visit{p.visits === 1 ? "" : "s"}</Chip>
                        <Chip tone="ink">{money(p.rate)} / visit</Chip>
                        <Chip tone="aqua">{p.upsellPct.toFixed(0)}% upsell</Chip>
                        {p.upsellAmount > 0 && <Chip tone="aqua">{money(p.upsellAmount)} sold</Chip>}
                        {p.bonus > 0 && <Chip tone="gold">{money(p.bonus)} bonus</Chip>}
                        {p.commission > 0 && <Chip tone="green">{money(p.commission)} commission</Chip>}
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------- TEAM (bonuses) */}
      {tab === "team" && canManage && (
        <div className="space-y-3">
          <p className="text-[0.75rem] opacity-60">
            Set each tech's default pay and commission, then drop in extra bonuses. Anything you add here
            lands on their next pay invoice.
          </p>
          {staff.map((s) => {
            const mine = adjustments.filter((a) => a.tech_id === s.id);
            return (
              <div key={s.id} className="ss-card p-4">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <div className="text-[0.95rem] font-semibold">{s.full_name}</div>
                    <div className="text-[0.7rem] uppercase tracking-[0.12em] opacity-55">{s.level}</div>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <label className="text-[0.62rem] uppercase tracking-[0.14em] opacity-60">
                      Pay per pool
                      <input
                        type="number"
                        step="0.5"
                        className="ss-input mt-1 w-28"
                        placeholder={String(s.level === "contractor" ? cfg.contractor_rate : cfg.default_rate)}
                        defaultValue={num(s.pay_rate)}
                        onBlur={(e) => {
                          const v = e.target.value === "" ? null : Number(e.target.value);
                          if (v !== s.pay_rate) void saveStaffPay(s.id, { pay_rate: v });
                        }}
                      />
                    </label>
                    <label className="text-[0.62rem] uppercase tracking-[0.14em] opacity-60">
                      Upsell commission %
                      <input
                        type="number"
                        step="1"
                        className="ss-input mt-1 w-24"
                        placeholder={String(cfg.upsell_pct)}
                        defaultValue={num(s.upsell_pct)}
                        onBlur={(e) => {
                          const v = e.target.value === "" ? null : Number(e.target.value);
                          if (v !== s.upsell_pct) void saveStaffPay(s.id, { upsell_pct: v });
                        }}
                      />
                    </label>
                  </div>
                </div>

                <BonusForm onAdd={(kind, amount, reason) => addAdjustment(s.id, kind, amount, reason)} />

                {mine.length > 0 && (
                  <ul className="mt-3 space-y-1 text-[0.75rem]">
                    {mine.map((a) => (
                      <li key={a.id} className="flex items-center justify-between gap-2 border-t border-black/5 pt-1">
                        <span className="min-w-0 truncate">
                          {a.effective_date} · {a.kind === "bonus" ? "Bonus" : "Commission"} ·{" "}
                          {a.reason ?? "—"}
                        </span>
                        <span className="flex items-center gap-2 whitespace-nowrap">
                          <strong>{money(Number(a.amount))}</strong>
                          {a.payout_id ? (
                            <Chip tone="green">on invoice</Chip>
                          ) : (
                            <button className="opacity-55 underline" onClick={() => removeAdjustment(a)}>
                              remove
                            </button>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
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

/* ------------------------------------------------------------------ bonus */
function BonusForm({
  onAdd,
}: {
  onAdd: (kind: string, amount: number, reason: string) => void | Promise<void>;
}) {
  const [kind, setKind] = useState("bonus");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");

  return (
    <div className="mt-3 flex flex-wrap items-end gap-2 border-t border-black/5 pt-3">
      <label className="text-[0.62rem] uppercase tracking-[0.14em] opacity-60">
        Type
        <select value={kind} onChange={(e) => setKind(e.target.value)} className="ss-input mt-1 block w-32">
          <option value="bonus">Bonus</option>
          <option value="commission">Commission</option>
          <option value="deduction">Deduction</option>
        </select>
      </label>
      <label className="text-[0.62rem] uppercase tracking-[0.14em] opacity-60">
        Amount
        <input
          type="number"
          step="0.5"
          className="ss-input mt-1 block w-24"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </label>
      <label className="min-w-[10rem] flex-1 text-[0.62rem] uppercase tracking-[0.14em] opacity-60">
        Reason
        <input
          className="ss-input mt-1 block w-full"
          placeholder="Upsell on Miller heater, perfect QC week…"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </label>
      <button
        className="ss-btn"
        onClick={async () => {
          const n = Number(amount) * (kind === "deduction" ? -1 : 1);
          await onAdd(kind, n, reason);
          setAmount("");
          setReason("");
        }}
      >
        Add
      </button>
    </div>
  );
}
