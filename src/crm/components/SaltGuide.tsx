import { useState } from "react";

/**
 * Salt pool reference shown on the customer card so a tech knows the exact
 * dose and target ranges before they touch the water.
 * lbs = gallons × ppm delta × 8.345 / 1,000,000
 */
const saltLbs = (gallons: number, deltaPpm: number) =>
  Math.max(0, (gallons * deltaPpm * 8.345) / 1_000_000);

const RANGES: { chem: string; range: string; why: string }[] = [
  {
    chem: "Salt",
    range: "2,700 – 3,400 ppm",
    why: "Too low and the cell won't make chlorine. Too high can damage equipment.",
  },
  { chem: "Free chlorine", range: "1.0 – 3.0 ppm", why: "What keeps the pool sanitized and clear." },
  {
    chem: "pH",
    range: "7.4 – 7.6",
    why: "Salt cells push pH up — expect regular muriatic acid to hold it down.",
  },
  {
    chem: "Total alkalinity",
    range: "70 – 90 ppm",
    why: "Keep slightly lower than a chlorine pool so pH stops spiking.",
  },
  {
    chem: "Cyanuric acid (CYA)",
    range: "50 – 80 ppm",
    why: "Stabilizer — salt pools need more of it to protect chlorine from the sun.",
  },
  {
    chem: "Calcium hardness",
    range: "200 – 400 ppm",
    why: "Stops the water from corroding surfaces and equipment.",
  },
];

const QUICK = [10000, 15000, 20000, 25000];

export default function SaltGuide({ gallons }: { gallons: number }) {
  const [current, setCurrent] = useState(0);
  const [target, setTarget] = useState(3200);
  const vol = gallons > 0 ? gallons : 15000;

  const delta = Math.max(0, target - current);
  const lbs = saltLbs(vol, delta);
  const bags = lbs / 40;

  return (
    <div className="space-y-4">
      <section className="ss-card p-4">
        <div className="ss-tag">Salt dose for this pool</div>
        <h3 className="ss-h3 mt-1">{vol.toLocaleString()} gal</h3>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <label className="block">
            <span className="ss-tag">Current salt (ppm)</span>
            <input
              type="number"
              min={0}
              value={current}
              onChange={(e) => setCurrent(parseFloat(e.target.value) || 0)}
              className="ss-num w-full rounded-md border border-[hsl(var(--ss-ink)/0.15)] bg-[hsl(48_44%_97%)] px-2 py-1 text-right outline-hidden"
            />
          </label>
          <label className="block">
            <span className="ss-tag">Target (ppm)</span>
            <input
              type="number"
              min={0}
              value={target}
              onChange={(e) => setTarget(parseFloat(e.target.value) || 0)}
              className="ss-num w-full rounded-md border border-[hsl(var(--ss-ink)/0.15)] bg-[hsl(48_44%_97%)] px-2 py-1 text-right outline-hidden"
            />
          </label>
          <div className="rounded-md border border-[hsl(var(--ss-ink)/0.12)] p-2">
            <div className="ss-tag">Salt needed</div>
            <div className="ss-num text-[1.1rem] font-bold">{Math.round(lbs)} lbs</div>
          </div>
          <div className="rounded-md border border-[hsl(var(--ss-ink)/0.12)] p-2">
            <div className="ss-tag">40 lb bags</div>
            <div className="ss-num text-[1.1rem] font-bold">{Math.ceil(bags - 0.001) || 0}</div>
          </div>
        </div>
        <p className="mt-3 text-[0.75rem] opacity-60">
          Golden standard is 3,200 ppm. Always test before adding — one 40 lb bag raises 10,000
          gallons by about 480 ppm. Never add salt with the cell running; brush it in and wait 24
          hours before retesting.
        </p>
      </section>

      <section className="ss-card p-4">
        <div className="ss-tag">Fresh fill quick chart (0 → 3,200 ppm)</div>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[380px] border-collapse text-[0.82rem]">
            <thead>
              <tr className="text-left">
                <th className="ss-tag pb-2">Pool volume</th>
                <th className="ss-tag pb-2 text-right">Total salt</th>
                <th className="ss-tag pb-2 text-right">40 lb bags</th>
              </tr>
            </thead>
            <tbody>
              {QUICK.map((g) => {
                const l = saltLbs(g, 3200);
                return (
                  <tr key={g} className="border-t border-[hsl(var(--ss-ink)/0.1)]">
                    <td className="py-1.5">{g.toLocaleString()} gal</td>
                    <td className="ss-num py-1.5 text-right">{Math.round(l)} lbs</td>
                    <td className="ss-num py-1.5 text-right">{Math.ceil(l / 40)} bags</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="ss-card p-4">
        <div className="ss-tag">Ideal readings — salt pool</div>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse text-[0.82rem]">
            <thead>
              <tr className="text-left">
                <th className="ss-tag pb-2">Chemical</th>
                <th className="ss-tag pb-2">Ideal range</th>
                <th className="ss-tag pb-2">Why it matters</th>
              </tr>
            </thead>
            <tbody>
              {RANGES.map((r) => (
                <tr key={r.chem} className="border-t border-[hsl(var(--ss-ink)/0.1)]">
                  <td className="py-1.5 pr-3 font-semibold">{r.chem}</td>
                  <td className="ss-num py-1.5 pr-3 whitespace-nowrap">{r.range}</td>
                  <td className="py-1.5 opacity-75">{r.why}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
