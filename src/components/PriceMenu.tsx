import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Row = {
  id: string;
  plan_name: string;
  pool_size: string;
  vegetation_level: string;
  price: number | null;
  size_rank: number | null;
  vegetation_rank: number | null;
};

const money = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

const PriceMenu = ({ onBook }: { onBook?: (service?: string) => void }) => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    supabase
      .from("service_pricing")
      .select("id, plan_name, pool_size, vegetation_level, price, size_rank, vegetation_rank")
      .eq("is_active", true)
      .order("size_rank", { ascending: true })
      .order("vegetation_rank", { ascending: true })
      .then(({ data }) => {
        if (!alive) return;
        setRows(((data ?? []) as Row[]).filter((r) => r.price != null));
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const sizes = Array.from(new Set(rows.map((r) => r.pool_size)));

  return (
    <section className="perf-section border-t border-hairline py-16 sm:py-24" id="price-menu">
      <div className="container-tight">
        <div className="font-tech text-[11px] uppercase tracking-[0.24em] text-muted-foreground mb-4">
          Price menu
        </div>
        <h2 className="font-display text-[1.9rem] sm:text-[2.6rem] uppercase tracking-tight leading-[1] mb-3">
          Monthly weekly-service pricing
        </h2>
        <p className="text-muted-foreground max-w-2xl mb-10 text-sm sm:text-base">
          Flat monthly rate by pool size and how much vegetation drops in the water. Chemicals,
          labor, and the photo report are included — no per-visit surprises.
        </p>

        {loading ? (
          <div className="grid gap-3 sm:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-40 animate-pulse border border-hairline bg-primary/[0.04]" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Call us for a flat quote on your pool.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sizes.map((size) => {
              const group = rows.filter((r) => r.pool_size === size);
              const from = Math.min(...group.map((r) => Number(r.price)));
              return (
                <div key={size} className="border border-hairline p-5 flex flex-col">
                  <div className="flex items-baseline justify-between gap-3 border-b border-hairline pb-3">
                    <h3 className="font-display text-[1.35rem] uppercase tracking-tight leading-none">
                      {size} pool
                    </h3>
                    <span className="font-tech text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                      from {money(from)}/mo
                    </span>
                  </div>
                  <ul className="divide-y divide-hairline">
                    {group.map((r) => (
                      <li key={r.id} className="flex items-center justify-between gap-4 py-3">
                        <span className="text-sm text-foreground/90">{r.vegetation_level}</span>
                        <span className="font-tech text-sm font-semibold">
                          {money(Number(r.price))}
                          <span className="text-muted-foreground">/mo</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    onClick={() => onBook?.(`Weekly Service — ${size} pool`)}
                    className="mt-auto pt-4 border-t border-hairline text-left text-[13px] font-semibold uppercase tracking-[0.1em] hover:text-primary transition"
                  >
                    Book this plan
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-6 border border-hairline bg-primary/[0.04] p-5 sm:p-6">
          <div className="font-tech text-[11px] uppercase tracking-[0.2em] text-accent mb-2">
            Add-on membership
          </div>
          <h3 className="font-display text-[1.3rem] uppercase tracking-tight leading-none mb-2">
            Swim Club — $19.99 / month
          </h3>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Stack it on any service plan (a $120 pool becomes $139.99/mo). You get the 24/7 service
            line, priority scheduling, member pricing on repairs, and free filter cleans on
            schedule.
          </p>
        </div>

        <p className="mt-4 font-tech text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          Chemical-only service and one-time cleans quoted on the walkthrough.
        </p>
      </div>
    </section>
  );
};

export default PriceMenu;
