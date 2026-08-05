import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Droplets, FileText, LogOut, Receipt, Waves } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { MARKETING_ORIGIN } from "@/hooks/useAppHost";

type Pool = {
  id: string;
  full_name: string;
  address: string | null;
  city: string | null;
  service_level: string;
  pool_type: string;
  gallons: number;
  route_day: string | null;
  monthly_price: number;
  referral_code: string | null;
  status: string;
};

type Visit = {
  id: string;
  scheduled_date: string;
  status: string;
  completed_at: string | null;
  readings: Record<string, unknown> | null;
  notes: string | null;
  after_photo_url: string | null;
};

type Invoice = {
  id: string;
  invoice_number: string;
  amount: number;
  status: string;
  issued_on: string;
  due_date: string | null;
  stripe_payment_url: string | null;
};

const money = (n: number) => `$${Number(n || 0).toFixed(2)}`;

export default function Portal() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [pool, setPool] = useState<Pool | null>(null);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    if (!loading && !user) navigate("/auth?next=/portal", { replace: true });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    (async () => {
      setBusy(true);
      const { data: poolRows } = await supabase.rpc("ss_my_pool");
      const mine = (poolRows as Pool[] | null)?.[0] ?? null;
      if (!alive) return;
      setPool(mine);
      if (mine) {
        const [{ data: v }, { data: inv }] = await Promise.all([
          supabase
            .from("ss_visits")
            .select("id,scheduled_date,status,completed_at,readings,notes,after_photo_url")
            .order("scheduled_date", { ascending: false })
            .limit(12),
          supabase
            .from("ss_invoices")
            .select("id,invoice_number,amount,status,issued_on,due_date,stripe_payment_url")
            .order("issued_on", { ascending: false })
            .limit(12),
        ]);
        if (!alive) return;
        setVisits((v as Visit[]) ?? []);
        setInvoices((inv as Invoice[]) ?? []);
      }
      setBusy(false);
    })();
    return () => {
      alive = false;
    };
  }, [user]);

  const nextVisit = useMemo(
    () => [...visits].reverse().find((v) => v.status !== "completed") ?? null,
    [visits],
  );
  const balance = useMemo(
    () => invoices.filter((i) => i.status !== "paid").reduce((s, i) => s + Number(i.amount || 0), 0),
    [invoices],
  );

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="border-b border-hairline bg-background">
        <div className="container-tight flex h-16 items-center justify-between gap-3 sm:h-[76px]">
          <Link to="/portal" aria-label="Savvy Swim — my pool" className="flex min-w-0 items-center">
            <span className="truncate font-display text-[1.25rem] uppercase leading-none tracking-tight text-accent sm:text-[1.7rem]">
              Savvy Swim
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <a
              href={MARKETING_ORIGIN}
              className="hidden font-tech text-xs text-primary/70 hover:text-accent sm:inline"
            >
              savvyswim.com
            </a>
            <button
              type="button"
              onClick={() => signOut()}
              className="inline-flex items-center gap-2 border border-primary/20 px-3 py-2 font-tech text-xs uppercase text-primary hover:border-primary"
            >
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="container-tight py-10 sm:py-14">
        <h1 className="font-display text-3xl uppercase leading-none tracking-tight sm:text-5xl">My pool</h1>

        {busy && <p className="mt-6 font-tech text-sm text-primary/60">Loading your pool…</p>}

        {!busy && !pool && (
          <div className="mt-8 border border-hairline p-6">
            <p className="font-tech text-sm text-primary/70">
              We couldn&rsquo;t find a pool linked to this account yet. Call the office and we&rsquo;ll connect it.
            </p>
          </div>
        )}

        {!busy && pool && (
          <>
            <section className="mt-8 grid gap-4 sm:grid-cols-3">
              <div className="border border-hairline p-5">
                <p className="font-tech text-[10px] uppercase tracking-widest text-primary/50">Service plan</p>
                <p className="mt-2 font-display text-2xl uppercase leading-none">{pool.service_level}</p>
                <p className="mt-2 font-tech text-xs text-primary/60">
                  {money(pool.monthly_price)}/mo · {pool.route_day ?? "Day TBD"}
                </p>
              </div>
              <div className="border border-hairline p-5">
                <p className="font-tech text-[10px] uppercase tracking-widest text-primary/50">Next visit</p>
                <p className="mt-2 font-display text-2xl uppercase leading-none">
                  {nextVisit ? new Date(nextVisit.scheduled_date).toLocaleDateString() : "Scheduling"}
                </p>
                <p className="mt-2 font-tech text-xs text-primary/60">{pool.city ?? ""}</p>
              </div>
              <div className="border border-hairline p-5">
                <p className="font-tech text-[10px] uppercase tracking-widest text-primary/50">Balance</p>
                <p className="mt-2 font-display text-2xl uppercase leading-none">{money(balance)}</p>
                <p className="mt-2 font-tech text-xs text-primary/60">
                  {pool.pool_type} · {pool.gallons.toLocaleString()} gal
                </p>
              </div>
            </section>

            <section className="mt-12">
              <h2 className="flex items-center gap-2 font-display text-xl uppercase tracking-tight">
                <Waves className="h-4 w-4 text-accent" aria-hidden="true" /> Service reports
              </h2>
              <div className="mt-4 divide-y divide-primary/10 border border-hairline">
                {visits.length === 0 && (
                  <p className="p-5 font-tech text-sm text-primary/60">No visits logged yet.</p>
                )}
                {visits.map((v) => (
                  <article key={v.id} className="p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-tech text-sm font-semibold">
                        {new Date(v.scheduled_date).toLocaleDateString()}
                      </p>
                      <span className="font-tech text-[10px] uppercase tracking-widest text-primary/55">
                        {v.status}
                      </span>
                    </div>
                    {v.readings && Object.keys(v.readings).length > 0 && (
                      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 font-tech text-xs text-primary/70">
                        {Object.entries(v.readings).map(([k, val]) => (
                          <li key={k} className="flex items-center gap-1.5">
                            <Droplets className="h-3 w-3 text-accent" aria-hidden="true" />
                            {k}: {String(val)}
                          </li>
                        ))}
                      </ul>
                    )}
                    {v.notes && <p className="mt-3 text-sm text-primary/75">{v.notes}</p>}
                    {v.after_photo_url && (
                      <img
                        src={v.after_photo_url}
                        alt={`Pool after service on ${new Date(v.scheduled_date).toLocaleDateString()}`}
                        loading="lazy"
                        className="mt-3 aspect-video w-full max-w-sm rounded-md object-cover"
                      />
                    )}
                  </article>
                ))}
              </div>
            </section>

            <section className="mt-12">
              <h2 className="flex items-center gap-2 font-display text-xl uppercase tracking-tight">
                <Receipt className="h-4 w-4 text-accent" aria-hidden="true" /> Billing
              </h2>
              <div className="mt-4 divide-y divide-primary/10 border border-hairline">
                {invoices.length === 0 && (
                  <p className="p-5 font-tech text-sm text-primary/60">No invoices yet.</p>
                )}
                {invoices.map((i) => (
                  <div key={i.id} className="flex flex-wrap items-center justify-between gap-3 p-5">
                    <div className="min-w-0">
                      <p className="font-tech text-sm font-semibold">
                        <FileText className="mr-1.5 inline h-3.5 w-3.5 text-accent" aria-hidden="true" />
                        {i.invoice_number}
                      </p>
                      <p className="font-tech text-xs text-primary/60">
                        Issued {new Date(i.issued_on).toLocaleDateString()} · {i.status}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-display text-lg">{money(i.amount)}</span>
                      {i.status !== "paid" && i.stripe_payment_url && (
                        <a
                          href={i.stripe_payment_url}
                          className="btn-quote rounded-md px-4 py-2 text-[11px] font-bold uppercase tracking-wide"
                        >
                          Pay
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
