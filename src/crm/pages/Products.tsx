import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { SectionTitle, Chip } from "@/crm/components/Brand";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  CONDITIONS,
  POOL_SIZES,
  SERVICE_PLANS,
  UNDERCUT_MAX,
  UNDERCUT_MIN,
  clampUndercut,
  computeQuote,
  findServicePlan,
  marketAverage,
  money,
  useRateCard,
} from "@/crm/lib/pricingEngine";




export default function Products() {
  const { cities, addons, margins, loading } = useRateCard();
  const [city, setCity] = useState("Dallas");
  const [size, setSize] = useState<string>(POOL_SIZES[1].id);
  const [condition, setCondition] = useState<string>(CONDITIONS[0].id);
  const [spa, setSpa] = useState<"none" | "medium" | "large">("none");
  const [chemOnly, setChemOnly] = useState(false);
  const [chemIncluded, setChemIncluded] = useState(false);
  const [saltCell, setSaltCell] = useState(false);
  const [undercut, setUndercut] = useState(15);
  const [override, setOverride] = useState<string>("");
  const [payingNow, setPayingNow] = useState<string>("");
  const [providerName, setProviderName] = useState<string>("");
  const [providerPlan, setProviderPlan] = useState<string>("");
  const [smsPhone, setSmsPhone] = useState<string>("");
  const [sending, setSending] = useState(false);
  const [params, setParams] = useSearchParams();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (params.get("undercut")) return;
    setUndercut(clampUndercut(margins.undercut_pct));
  }, [margins.undercut_pct, params]);

  // Hydrate the calculator from a shared quote link (?city=…&size=…)
  useEffect(() => {
    if (hydrated) return;
    setHydrated(true);
    const g = (k: string) => params.get(k);
    if (g("city")) setCity(g("city")!);
    if (g("size")) setSize(g("size")!);
    if (g("cond")) setCondition(g("cond")!);
    if (g("spa")) setSpa(g("spa") as typeof spa);
    if (g("chemOnly") === "1") setChemOnly(true);
    if (g("chemIncl") === "1") setChemIncluded(true);
    if (g("salt") === "1") setSaltCell(true);
    if (g("undercut")) setUndercut(clampUndercut(Number(g("undercut"))));
    if (g("override")) setOverride(g("override")!);
    if (g("now")) setPayingNow(g("now")!);
    if (g("provider")) setProviderName(g("provider")!);
    if (g("plan")) setProviderPlan(g("plan")!);
  }, [hydrated, params]);

  useEffect(() => {
    if (!hydrated) return;
    if (cities.length && !cities.some((c) => c.city === city)) setCity(cities[0].city);
  }, [cities, city, hydrated]);


  const quote = computeQuote(
    {
      city,
      poolSize: size,
      condition,
      spa,
      chemOnly,
      chemIncluded,
      saltCell,
      undercutPct: undercut,
      rateOverride: override ? Number(override) : null,
    },
    cities,
    addons,
  );

  const band = cities.find((c) => c.city === city);

  const currentMonthly = Number(payingNow) > 0 ? Number(payingNow) : 0;
  const vsCurrent = currentMonthly ? currentMonthly - quote.monthly : 0;
  const vsCurrentYear = vsCurrent * 12;
  const vsCurrentPct = currentMonthly
    ? Math.round((vsCurrent / currentMonthly) * 100)
    : 0;
  const vsMarketYear = quote.market.savings * 12;

  const quoteParams = () => {
    const p = new URLSearchParams({
      city,
      size,
      cond: condition,
      spa,
      undercut: String(undercut),
    });
    if (chemOnly) p.set("chemOnly", "1");
    if (chemIncluded) p.set("chemIncl", "1");
    if (saltCell) p.set("salt", "1");
    if (override) p.set("override", override);
    if (payingNow) p.set("now", payingNow);
    if (providerName.trim()) p.set("provider", providerName.trim());
    if (providerPlan.trim()) p.set("plan", providerPlan.trim());
    return p;
  };

  const shareLink = `${window.location.origin}/admin/crm/products?${quoteParams().toString()}`;

  const summaryText = [
    `Savvy Swim quote — ${city}`,
    `${quote.size.label} pool · ${money(quote.monthly)}/mo`,
    quote.cleanupLabel ? `One-time cleanup ${quote.cleanupLabel}` : null,
    currentMonthly && vsCurrent > 0
      ? `Saves ${money(vsCurrent)}/mo vs ${providerName.trim() || "their current provider"} — ${money(vsCurrentYear)} over 12 months`
      : `Regional average ${money(quote.market.avg)}`,
  ]
    .filter(Boolean)
    .join("\n");

  const sendSms = async () => {
    if (!smsPhone.trim()) {
      toast({ title: "Add a phone number", description: "Enter the number to text this quote to." });
      return;
    }
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-quote-sms", {
        body: { phone: smsPhone.trim(), message: summaryText, link: shareLink },
      });
      if (error) throw error;
      if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
      toast({ title: "Quote sent", description: `Texted to ${smsPhone.trim()}` });
    } catch (e) {
      toast({
        title: "Could not send the text",
        description: e instanceof Error ? e.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(shareLink);
    setParams(quoteParams(), { replace: true });
    toast({ title: "Quote link copied" });
  };



  return (
    <div className="space-y-4">
      <SectionTitle
        title="Savvy Estimate"
        sub="Quote calculator — sized by pool, benchmarked against the regional average. Plan tiers and rates live in Service plans."
      />

      {loading ? (
        <div className="ss-card p-6 text-[0.85rem] opacity-60">Loading rate card…</div>
      ) : (

        <div className="grid gap-3 lg:grid-cols-2">
          <div className="ss-card p-4">
            <div className="ss-label mb-2">Quote calculator</div>
            <div className="grid gap-2.5 sm:grid-cols-2">
              <div>
                <label className="ss-label">City / region</label>
                <select className="ss-input" value={city} onChange={(e) => setCity(e.target.value)}>
                  {cities.map((c) => (
                    <option key={c.id}>{c.city}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="ss-label">Pool size</label>
                <select className="ss-input" value={size} onChange={(e) => setSize(e.target.value)}>
                  {POOL_SIZES.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="ss-label">Condition</label>
                <select
                  className="ss-input"
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                >
                  {CONDITIONS.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="ss-label">Spa</label>
                <select
                  className="ss-input"
                  value={spa}
                  onChange={(e) => setSpa(e.target.value as typeof spa)}
                >
                  <option value="none">No spa</option>
                  <option value="medium">Medium spa</option>
                  <option value="large">Large spa</option>
                </select>
              </div>
              <div>
                <label className="ss-label">Undercut regional average</label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={UNDERCUT_MIN}
                    max={UNDERCUT_MAX}
                    step={1}
                    value={undercut}
                    onChange={(e) => setUndercut(Number(e.target.value))}
                    className="w-full"
                  />
                  <span className="ss-num text-[0.85rem] font-bold">{undercut}%</span>
                </div>
              </div>
              <div>
                <label className="ss-label">Manual rate override</label>
                <input
                  type="number"
                  className="ss-input ss-num"
                  placeholder="Auto"
                  value={override}
                  onChange={(e) => setOverride(e.target.value)}
                />
              </div>
              <div>
                <label className="ss-label">What they pay now / mo</label>
                <input
                  type="number"
                  className="ss-input ss-num"
                  placeholder="e.g. 240"
                  value={payingNow}
                  onChange={(e) => setPayingNow(e.target.value)}
                />
              </div>
              <div>
                <label className="ss-label">Current provider (optional)</label>
                <input
                  className="ss-input"
                  placeholder="e.g. Blue Wave Pools"
                  value={providerName}
                  onChange={(e) => setProviderName(e.target.value)}
                />
              </div>
              <div>
                <label className="ss-label">Their rate plan (optional)</label>
                <input
                  className="ss-input"
                  placeholder="e.g. Weekly full service"
                  value={providerPlan}
                  onChange={(e) => setProviderPlan(e.target.value)}
                />
              </div>
            </div>

            <div className="mt-2 flex flex-wrap gap-3 text-[0.78rem]">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={chemOnly}
                  onChange={(e) => setChemOnly(e.target.checked)}
                />
                Chem-only
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={chemIncluded}
                  onChange={(e) => setChemIncluded(e.target.checked)}
                />
                Chemicals included
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={saltCell}
                  onChange={(e) => setSaltCell(e.target.checked)}
                />
                Saltwater system
              </label>
            </div>
          </div>

          <div className="space-y-3">
            <div className="ss-hero p-4">
              <div
                className="ss-tag"
                style={{ fontSize: "0.55rem", color: "rgba(255,255,255,.7)" }}
              >
                Our monthly price
              </div>
              <div className="ss-num mt-1 text-[2rem] font-bold leading-none">
                {money(quote.monthly)}
              </div>
              <div className="mt-2 text-[0.78rem] opacity-85">
                Regional average {money(quote.market.avg)} ·{" "}
                {quote.market.savings > 0
                  ? `${money(quote.market.savings)}/mo under market (${quote.market.savingsPct}%)`
                  : "at or above market — review the rate"}
              </div>
              {quote.cleanupLabel && (
                <div className="mt-1 text-[0.78rem] opacity-75">
                  One-time cleanup {quote.cleanupLabel}
                </div>
              )}
            </div>

            <div className="ss-card p-4">
              <div className="ss-label mb-2">12-month savings</div>
              {currentMonthly ? (
                <>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <div className="ss-label">
                        {providerName.trim() ? providerName.trim() : "They pay now"}
                      </div>
                      <div className="ss-num text-[1.05rem] font-bold">
                        {money(currentMonthly)}/mo
                      </div>
                      {providerPlan.trim() && (
                        <div className="text-[0.68rem] opacity-70">{providerPlan.trim()}</div>
                      )}
                    </div>
                    <div>
                      <div className="ss-label">With Savvy Swim</div>
                      <div className="ss-num text-[1.05rem] font-bold">
                        {money(quote.monthly)}/mo
                      </div>
                    </div>
                    <div>
                      <div className="ss-label">Saved / mo</div>
                      <div className="ss-num text-[1.05rem] font-bold">
                        {vsCurrent > 0 ? money(vsCurrent) : "—"}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 text-[0.85rem] font-bold">
                    {vsCurrent > 0
                      ? `Switching from ${providerName.trim() || "their current provider"}${
                          providerPlan.trim() ? ` (${providerPlan.trim()})` : ""
                        } saves ${money(vsCurrentYear)} over 12 months — ${vsCurrentPct}% less than today`
                      : `Our rate is at or above what ${
                          providerName.trim() || "their current provider"
                        } charges today — adjust the rate or lead with service value`}
                  </div>

                </>
              ) : (
                <div className="text-[0.8rem] opacity-70">
                  Enter what they pay today to show their 12-month savings. Versus the
                  regional average this quote saves{" "}
                  <strong className="ss-num">{money(vsMarketYear)}</strong> a year.
                </div>
              )}
            </div>

            <div className="ss-card p-4">
              <div className="ss-label mb-2">Text this quote</div>
              <div className="flex flex-wrap items-end gap-2">
                <div className="min-w-[10rem] flex-1">
                  <label className="ss-label">Send to phone</label>
                  <input
                    type="tel"
                    className="ss-input ss-num"
                    placeholder="(214) 555-0142"
                    value={smsPhone}
                    onChange={(e) => setSmsPhone(e.target.value)}
                  />
                </div>
                <button className="ss-btn" onClick={sendSms} disabled={sending}>
                  {sending ? "SENDING…" : "SEND SMS"}
                </button>
                <button className="ss-btn ss-btn-ghost" onClick={copyLink}>
                  COPY LINK
                </button>
              </div>
              <div className="mt-3 whitespace-pre-line rounded-md bg-black/5 p-2 text-[0.75rem] opacity-80">
                {summaryText}
                {"\n\nView & edit: "}
                <span className="break-all">{shareLink}</span>
              </div>
            </div>



            <div className="ss-card p-4">
              <div className="ss-label mb-2">Regional benchmark · {city}</div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <div className="ss-label">Market avg</div>
                  <div className="ss-num text-[1.05rem] font-bold">{money(quote.market.avg)}</div>
                </div>
                <div>
                  <div className="ss-label">Target −{quote.market.pct}%</div>
                  <div className="ss-num text-[1.05rem] font-bold">
                    {money(quote.market.target)}
                  </div>
                </div>
                <div>
                  <div className="ss-label">Our band</div>
                  <div className="ss-num text-[1.05rem] font-bold">
                    {money(quote.band.low)}–{money(quote.band.high)}
                  </div>
                </div>
              </div>
              {band?.market_note && (
                <div className="mt-2 text-[0.72rem] opacity-70">{band.market_note}</div>
              )}
              <div className="mt-3 space-y-1 text-[0.78rem]">
                {quote.lines.map((l, i) => (
                  <div key={i} className="flex justify-between">
                    <span className="opacity-75">{l.label}</span>
                    <span className="ss-num">{money(l.amount)}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <Chip tone="aqua">{quote.size.label}</Chip>
                <Chip tone="gold">
                  Benchmark {money(marketAverage(band))} base avg
                </Chip>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
