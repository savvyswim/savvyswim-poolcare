import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Plus, Sparkles, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Chip, SectionTitle } from "@/crm/components/Brand";
import {
  type Addon,
  type CityRate,
  type Margins,
  UNDERCUT_MAX,
  UNDERCUT_MIN,
  clampUndercut,
  marginFloor,
  marketAverage,
  money,
  undercutTarget,
  recommendRate,
  saveMargins,
  useRateCard,
} from "@/crm/lib/pricingEngine";

type WonAvg = Record<string, number>;

export default function PricingTab({ isOwner }: { isOwner: boolean }) {
  const { cities, addons, margins, loading, refresh, setCities, setAddons, setMargins } =
    useRateCard();
  const [wonAvg, setWonAvg] = useState<WonAvg>({});
  const [wizard, setWizard] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase
        .from("ss_leads")
        .select("city, monthly_value")
        .eq("stage", "won")
        .limit(1000);
      const totals: Record<string, { sum: number; n: number }> = {};
      for (const r of data ?? []) {
        const city = (r.city ?? "").trim();
        const v = Number(r.monthly_value ?? 0);
        if (!city || v <= 0) continue;
        totals[city] = totals[city] ?? { sum: 0, n: 0 };
        totals[city].sum += v;
        totals[city].n += 1;
      }
      setWonAvg(
        Object.fromEntries(Object.entries(totals).map(([c, t]) => [c, t.sum / t.n])),
      );
    })();
  }, []);

  useEffect(() => {
    if (!loading && isOwner && margins.wizard_done === false) setWizard(true);
  }, [loading, isOwner, margins.wizard_done]);

  const floor = marginFloor(margins);

  const patchCity = async (id: string, patch: Partial<CityRate>) => {
    setCities((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
    const { error } = await supabase.from("ss_city_rates").update(patch).eq("id", id);
    if (error) toast.error(error.message);
  };

  const patchAddon = async (id: string, patch: Partial<Addon>) => {
    setAddons((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));
    const { error } = await supabase.from("ss_addons").update(patch).eq("id", id);
    if (error) toast.error(error.message);
  };

  const addAddon = async () => {
    const key = `addon_${Date.now().toString(36)}`;
    const { error } = await supabase
      .from("ss_addons")
      .insert({ key, label: "New add-on", amount: 0, sort_order: addons.length + 10 });
    if (error) return toast.error(error.message);
    void refresh();
    return undefined;
  };

  const removeAddon = async (id: string) => {
    const { error } = await supabase.from("ss_addons").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setAddons((prev) => prev.filter((a) => a.id !== id));
    return undefined;
  };

  const addCity = async () => {
    const city = window.prompt("City name")?.trim();
    if (!city) return;
    const { error } = await supabase
      .from("ss_city_rates")
      .insert({
        city,
        low: floor,
        high: Math.round(floor * 1.3),
        market_avg: Math.round(floor * 1.3),
        sort_order: cities.length + 1,
      });
    if (error) return toast.error(error.message);
    void refresh();
    return undefined;
  };

  const saveMarginSettings = async (patch: Partial<Margins>) => {
    setMargins((m) => ({ ...m, ...patch }));
    const err = await saveMargins(patch);
    if (err) toast.error(err);
  };

  const thinCount = useMemo(
    () => cities.filter((c) => Number(c.low) < floor).length,
    [cities, floor],
  );

  if (loading) return <div className="ss-card p-6 text-[0.85rem] opacity-60">Loading rate card…</div>;

  return (
    <div className="space-y-4">
      <SectionTitle
        title="Pricing engine"
        sub="Every number here drives the in-app quote, the public quote page and pipeline values"
        right={
          isOwner ? (
            <button className="ss-btn ss-btn-ghost" onClick={() => { setStep(0); setWizard(true); }}>
              <Sparkles size={13} /> Setup wizard
            </button>
          ) : null
        }
      />

      <div className="grid gap-3 md:grid-cols-4">
        <div className="ss-card p-3">
          <div className="ss-label">Chemical cost basis / month</div>
          <input
            type="number"
            className="ss-input ss-num mt-1"
            disabled={!isOwner}
            value={margins.chem_cost_basis}
            onChange={(e) => saveMarginSettings({ chem_cost_basis: Number(e.target.value) })}
          />
        </div>
        <div className="ss-card p-3">
          <div className="ss-label">Margin multiplier</div>
          <input
            type="number"
            step="0.1"
            className="ss-input ss-num mt-1"
            disabled={!isOwner}
            value={margins.margin_multiplier}
            onChange={(e) => saveMarginSettings({ margin_multiplier: Number(e.target.value) })}
          />
        </div>
        <div className="ss-card p-3">
          <div className="ss-label">Undercut market by (%)</div>
          <div className="mt-1 flex items-center gap-2">
            <input
              type="range"
              min={UNDERCUT_MIN}
              max={UNDERCUT_MAX}
              step={1}
              className="w-full"
              disabled={!isOwner}
              value={clampUndercut(margins.undercut_pct)}
              onChange={(e) => saveMarginSettings({ undercut_pct: clampUndercut(Number(e.target.value)) })}
            />
            <span className="ss-num text-[0.9rem] font-bold">{clampUndercut(margins.undercut_pct)}%</span>
          </div>
          <div className="mt-1 text-[0.66rem] opacity-65">
            Estimates aim this far below the regional average
          </div>
        </div>
        <div className="ss-hero p-3">
          <div className="ss-tag" style={{ fontSize: "0.55rem", color: "rgba(255,255,255,.7)" }}>
            Margin floor
          </div>
          <div className="ss-num mt-1 text-[1.35rem] font-bold leading-none">{money(floor)}</div>
          <div className="mt-1 text-[0.68rem] opacity-75">
            {thinCount ? `${thinCount} city ${thinCount === 1 ? "rate is" : "rates are"} below the floor` : "All city rates clear the floor"}
          </div>
        </div>
      </div>

      <div className="ss-card p-3">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div className="ss-label">
            City monthly rate table · regional average vs our quote target
          </div>
          {isOwner && (
            <button className="ss-btn ss-btn-ghost" onClick={addCity}>
              <Plus size={13} /> Add city
            </button>
          )}
        </div>
        <div className="-mx-3 overflow-x-auto px-3">
        <table className="w-full min-w-[880px] table-fixed text-[0.8rem]">
          <colgroup>
            <col className="w-[150px]" />
            <col className="w-[104px]" />
            <col className="w-[104px]" />
            <col className="w-[116px]" />
            <col className="w-[110px]" />
            <col className="w-[96px]" />
            <col />
          </colgroup>
          <thead>
            <tr className="ss-label [&>th]:whitespace-nowrap">
              <th className="p-1.5 text-left">City</th>
              <th className="p-1.5 text-right">Low</th>
              <th className="p-1.5 text-right">High</th>
              <th className="p-1.5 text-right">Regional avg</th>
              <th className="p-1.5 text-right">Quote target</th>
              <th className="p-1.5 text-right">Won avg</th>
              <th className="p-1.5 text-left">Recommendation</th>
            </tr>
          </thead>

          <tbody>
            {cities.map((c) => {
              const rec = recommendRate(c, wonAvg[c.city] ?? null, floor);
              return (
                <tr key={c.id} style={{ borderTop: "1px solid hsl(var(--ss-sand))" }}>
                  <td className="p-1.5 font-semibold">{c.city}</td>
                  <td className="p-1.5 text-right">
                    <input
                      type="number"
                      className="ss-input ss-num w-24 text-right"
                      disabled={!isOwner}
                      value={c.low}
                      onChange={(e) => patchCity(c.id, { low: Number(e.target.value) })}
                    />
                  </td>
                  <td className="p-1.5 text-right">
                    <input
                      type="number"
                      className="ss-input ss-num w-24 text-right"
                      disabled={!isOwner}
                      value={c.high}
                      onChange={(e) => patchCity(c.id, { high: Number(e.target.value) })}
                    />
                  </td>
                  <td className="p-1.5 text-right">
                    <input
                      type="number"
                      className="ss-input ss-num w-24 text-right"
                      disabled={!isOwner}
                      value={c.market_avg ?? 0}
                      onChange={(e) => patchCity(c.id, { market_avg: Number(e.target.value) })}
                    />
                  </td>
                  <td className="ss-num p-1.5 text-right font-semibold">
                    {money(
                      undercutTarget(marketAverage(c), clampUndercut(margins.undercut_pct), floor),
                    )}
                  </td>
                  <td className="ss-num p-1.5 text-right opacity-70">
                    {rec.wonAvg ? money(rec.wonAvg) : "—"}
                  </td>
                  <td className="p-1.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Chip tone="aqua">Suggest {money(rec.suggested)}</Chip>
                      {rec.thin && (
                        <Chip tone="gold">
                          <AlertTriangle size={11} /> Thin margin · floor {money(floor)}
                        </Chip>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="ss-card p-3">
        <div className="mb-2 flex items-center justify-between">
          <div className="ss-label">Add-ons the quote engine reads</div>
          {isOwner && (
            <button className="ss-btn ss-btn-ghost" onClick={addAddon}>
              <Plus size={13} /> Add row
            </button>
          )}
        </div>
        <div className="space-y-2">
          {addons.map((a) => (
            <div key={a.id} className="grid items-center gap-2 sm:grid-cols-[1.4fr,.8fr,.8fr,auto]">
              <input
                className="ss-input"
                disabled={!isOwner}
                value={a.label}
                onChange={(e) => patchAddon(a.id, { label: e.target.value })}
              />
              <select
                className="ss-input"
                disabled={!isOwner}
                value={a.kind}
                onChange={(e) => patchAddon(a.id, { kind: e.target.value })}
              >
                <option value="flat">$ flat</option>
                <option value="percent">% of base</option>
              </select>
              <input
                type="number"
                className="ss-input ss-num"
                disabled={!isOwner}
                value={a.amount}
                onChange={(e) => patchAddon(a.id, { amount: Number(e.target.value) })}
              />
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1 text-[0.7rem] opacity-70">
                  <input
                    type="checkbox"
                    disabled={!isOwner}
                    checked={a.is_active}
                    onChange={(e) => patchAddon(a.id, { is_active: e.target.checked })}
                  />
                  Active
                </label>
                {isOwner && (
                  <button className="ss-btn ss-btn-ghost" onClick={() => removeAddon(a.id)}>
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {wizard && isOwner && (
        <div className="ss-modal-backdrop" onClick={() => setWizard(false)}>
          <div className="ss-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ss-label">First-run pricing setup — step {step + 1} of 3</div>
            <h3 className="mt-1 text-[1rem]">
              {["Confirm city rates", "Confirm add-ons", "Confirm margins"][step]}
            </h3>
            <div className="mt-3 max-h-[45vh] overflow-y-auto pr-1 text-[0.8rem]">
              {step === 0 && (
                <table className="w-full">
                  <tbody>
                    {cities.map((c) => (
                      <tr key={c.id} style={{ borderTop: "1px solid hsl(var(--ss-sand))" }}>
                        <td className="p-1.5">{c.city}</td>
                        <td className="p-1.5 text-right">
                          <input
                            type="number"
                            className="ss-input ss-num w-20 text-right"
                            value={c.low}
                            onChange={(e) => patchCity(c.id, { low: Number(e.target.value) })}
                          />
                        </td>
                        <td className="p-1.5 text-right">
                          <input
                            type="number"
                            className="ss-input ss-num w-20 text-right"
                            value={c.high}
                            onChange={(e) => patchCity(c.id, { high: Number(e.target.value) })}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {step === 1 &&
                addons.map((a) => (
                  <div key={a.id} className="mb-2 grid grid-cols-[1.4fr,.7fr] gap-2">
                    <input
                      className="ss-input"
                      value={a.label}
                      onChange={(e) => patchAddon(a.id, { label: e.target.value })}
                    />
                    <input
                      type="number"
                      className="ss-input ss-num"
                      value={a.amount}
                      onChange={(e) => patchAddon(a.id, { amount: Number(e.target.value) })}
                    />
                  </div>
                ))}
              {step === 2 && (
                <div className="space-y-2">
                  <div>
                    <label className="ss-label">Chemical cost basis / month</label>
                    <input
                      type="number"
                      className="ss-input ss-num"
                      value={margins.chem_cost_basis}
                      onChange={(e) => saveMarginSettings({ chem_cost_basis: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label className="ss-label">Margin multiplier</label>
                    <input
                      type="number"
                      step="0.1"
                      className="ss-input ss-num"
                      value={margins.margin_multiplier}
                      onChange={(e) => saveMarginSettings({ margin_multiplier: Number(e.target.value) })}
                    />
                  </div>
                  <p className="text-[0.75rem] opacity-70">
                    Margin floor is {money(floor)} per month. Any city rate under that shows a thin-margin warning.
                  </p>
                </div>
              )}
            </div>
            <div className="mt-3 flex justify-between gap-2">
              <button className="ss-btn ss-btn-ghost" onClick={() => setWizard(false)}>
                Finish later
              </button>
              <div className="flex gap-2">
                {step > 0 && (
                  <button className="ss-btn ss-btn-ghost" onClick={() => setStep((s) => s - 1)}>
                    Back
                  </button>
                )}
                <button
                  className="ss-btn"
                  onClick={async () => {
                    if (step < 2) return setStep((s) => s + 1);
                    await saveMarginSettings({ wizard_done: true });
                    setWizard(false);
                    toast.success("Pricing confirmed");
                  }}
                >
                  {step < 2 ? "Next" : "Approve pricing"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
