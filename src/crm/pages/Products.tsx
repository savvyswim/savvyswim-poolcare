import { useState } from "react";
import { SectionTitle } from "@/crm/components/Brand";
import { CITY_PRICING, CHEM_ONLY_FACTOR, CONDITIONS, POOL_SIZES, SPA_OPTIONS, computeQuote, money } from "@/crm/lib/pricing";

export default function Products() {
  const [city, setCity] = useState("Dallas");
  const [size, setSize] = useState(POOL_SIZES[1].id);
  const [condition, setCondition] = useState(CONDITIONS[0].id);
  const [spa, setSpa] = useState(SPA_OPTIONS[0].id);
  const [chemOnly, setChemOnly] = useState(false);

  const quote = computeQuote({ city, poolSize: size, condition, spa, serviceType: chemOnly ? "chem_only" : "full" });

  return (
    <div className="space-y-4">
      <SectionTitle title="Products & services" sub="DFW rate card and instant quote calculator" />

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
                {CONDITIONS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </div>
            <div>
              <label className="ss-label">Spa</label>
              <select className="ss-input" value={spa} onChange={(e) => setSpa(e.target.value)}>
                {SPA_OPTIONS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </div>
          </div>
          <label className="mt-3 flex items-center gap-2 text-[0.83rem]">
            <input type="checkbox" checked={chemOnly} onChange={(e) => setChemOnly(e.target.checked)} />
            Chemical-only service ({Math.round(CHEM_ONLY_FACTOR * 100)}% of full service)
          </label>
        </div>

        <div className="ss-hero p-4">
          <div className="ss-tag" style={{ color: "rgba(255,255,255,.7)", fontSize: "0.52rem" }}>Estimate</div>
          <div className="ss-num mt-1 text-[2.4rem] font-bold leading-none">{money(quote.monthly)}</div>
          <div className="text-[0.76rem] opacity-80">per month · {city}</div>
          {quote.cleanup > 0 && (
            <div className="mt-3 border-t pt-2 text-[0.85rem]" style={{ borderColor: "rgba(255,255,255,.22)" }}>
              One-time clean-up: <strong className="ss-num">{money(quote.cleanup)}</strong>
            </div>
          )}
          <div className="mt-3 text-[0.72rem] opacity-75">
            Range for this city: {money(CITY_PRICING[city].low)} – {money(CITY_PRICING[city].high)}
          </div>
        </div>
      </div>

      <div className="ss-card overflow-x-auto p-4">
        <div className="ss-label mb-2">City rate card</div>
        <table className="w-full text-[0.82rem]">
          <thead>
            <tr className="ss-tag">
              <th className="p-1.5 text-left">City</th>
              <th className="p-1.5 text-right">Low</th>
              <th className="p-1.5 text-right">Typical</th>
              <th className="p-1.5 text-right">High</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(CITY_PRICING).map(([c, p]) => (
              <tr key={c} style={{ borderTop: "1px solid hsl(var(--ss-sand))" }}>
                <td className="p-1.5">{c}</td>
                <td className="ss-num p-1.5 text-right">{money(p.low)}</td>
                <td className="ss-num p-1.5 text-right font-semibold">{money(p.mid)}</td>
                <td className="ss-num p-1.5 text-right">{money(p.high)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
