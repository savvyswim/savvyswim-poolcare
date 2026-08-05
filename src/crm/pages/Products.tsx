import { useState } from "react";
import { SectionTitle } from "@/crm/components/Brand";
import PricingTab from "@/crm/components/PricingTab";
import { useSavvyIdentity } from "@/crm/lib/useSavvy";
import { CITY_PRICING, CONDITIONS, POOL_SIZES, SPA_OPTIONS, computeQuote, money } from "@/crm/lib/pricing";

const TABS = ["Quote", "Pricing"] as const;

export default function Products() {
  const { isOwner } = useSavvyIdentity();
  const [tab, setTab] = useState<(typeof TABS)[number]>("Quote");
  const [city, setCity] = useState("Dallas");
  const [size, setSize] = useState(POOL_SIZES[1].id);
  const [condition, setCondition] = useState(CONDITIONS[0].id);
  const [spa, setSpa] = useState(SPA_OPTIONS[0].id);
  const [chemOnly, setChemOnly] = useState(false);

  const quote = computeQuote({ city, poolSize: size, condition, spa, serviceType: chemOnly ? "chem_only" : "full" });

  return (
    <div className="space-y-4">
      <SectionTitle title="Products & services" sub="Rate card, quote calculator and pricing engine" />

      <div className="flex flex-wrap gap-1.5">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={t === tab ? "ss-btn" : "ss-btn ss-btn-ghost"}
          >
            {t.toUpperCase()}
          </button>
        ))}
      </div>

      {tab === "Pricing" ? (
        <PricingTab isOwner={isOwner} />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="ss-card p-4">
            <div className="ss-label mb-2">Quote calculator</div>
            <div className="grid gap-2.5 sm:grid-cols-2">
              <div>
                <label className="ss-label">City</label>
                <select className="ss-input" value={city} onChange={(e) => setCity(e.target.value)}>
                  {Object.keys(CITY_PRICING).map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="ss-label">Pool size</label>
                <select className="ss-input" value={size} onChange={(e) => setSize(e.target.value)}>
                  {POOL_SIZES.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                </select>
              </div>
              <div>
                <label className="ss-label">Condition</label>
                <select className="ss-input" value={condition} onChange={(e) => setCondition(e.target.value)}>
                  {CONDITIONS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="ss-label">Spa</label>
                <select className="ss-input" value={spa} onChange={(e) => setSpa(e.target.value)}>
                  {SPA_OPTIONS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </div>
            </div>
            <label className="mt-2 flex items-center gap-2 text-[0.78rem]">
              <input type="checkbox" checked={chemOnly} onChange={(e) => setChemOnly(e.target.checked)} />
              Chem-only service
            </label>
          </div>

          <div className="ss-hero p-4">
            <div className="ss-tag" style={{ fontSize: "0.55rem", color: "rgba(255,255,255,.7)" }}>
              Monthly service
            </div>
            <div className="ss-num mt-1 text-[2rem] font-bold leading-none">{money(quote.monthly)}</div>
            {quote.cleanupLabel && (
              <div className="mt-2 text-[0.78rem] opacity-80">One-time cleanup {quote.cleanupLabel}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
