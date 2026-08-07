import { useEffect, useMemo, useState } from "react";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { CreditCard, Loader2, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getStripe, getStripeEnvironment, PAYMENTS_ENABLED } from "@/lib/stripe";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

type PricingRow = {
  id: string;
  pool_size: string;
  vegetation_level: string;
  plan_name: string | null;
  price: number | null;
  price_key: string | null;
};

export type AutopayPool = {
  id: string;
  full_name: string;
  address: string | null;
  city: string | null;
  monthly_price: number;
};

const money = (n: number) => `$${Number(n || 0).toFixed(2)}`;

type SubRow = {
  plan_name: string | null;
  amount: number | null;
  status: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean | null;
};

const ACTIVE = new Set(["active", "trialing", "past_due"]);

export default function AutopayCard({ pool, email }: { pool: AutopayPool; email: string }) {
  const [rows, setRows] = useState<PricingRow[]>([]);
  const [sub, setSub] = useState<SubRow | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    supabase
      .from("service_pricing")
      .select("id,pool_size,vegetation_level,plan_name,price,price_key")
      .eq("is_active", true)
      .then(({ data }) => setRows((data ?? []) as PricingRow[]));
  }, []);

  useEffect(() => {
    if (!email) return;
    supabase
      .from("subscriptions")
      .select("plan_name,amount,status,current_period_end,cancel_at_period_end")
      .eq("environment", getStripeEnvironment())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setSub((data as SubRow | null) ?? null));
  }, [email]);

  /** Match the customer's monthly rate to the closest published plan. */
  const plan = useMemo(() => {
    const priced = rows.filter((r) => r.price != null && r.price_key);
    if (!priced.length) return null;
    return priced.reduce((best, r) =>
      Math.abs((r.price ?? 0) - pool.monthly_price) < Math.abs((best.price ?? 0) - pool.monthly_price) ? r : best,
    );
  }, [rows, pool.monthly_price]);

  const autopayOn = !!sub && ACTIVE.has(sub.status);
  const nextDate = sub?.current_period_end ? new Date(sub.current_period_end) : null;
  const nextAmount = sub?.amount != null ? Number(sub.amount) : pool.monthly_price;
  const willCancel = autopayOn && !!sub?.cancel_at_period_end;

  const fetchClientSecret = async (): Promise<string> => {
    const { data, error } = await supabase.functions.invoke("create-subscription-checkout", {
      body: {
        priceKey: plan?.price_key,
        environment: getStripeEnvironment(),
        returnUrl: `${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
        customerName: pool.full_name,
        email,
        address: [pool.address, pool.city].filter(Boolean).join(", "),
        notes: "Autopay enabled from the customer portal.",
      },
    });
    if (error || !data?.clientSecret) {
      throw new Error(error?.message || data?.error || "Could not start autopay");
    }
    return data.clientSecret as string;
  };

  return (
    <div className="mt-4 border border-hairline p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-tech text-[10px] uppercase tracking-widest text-primary/50">
            Autopay {autopayOn ? "· on" : "· off"}
          </p>
          <p className="mt-1 font-display text-lg uppercase tracking-tight">
            {sub?.plan_name ?? plan?.plan_name ?? "Monthly pool service"}
          </p>
          <p className="font-tech text-sm text-primary/70">
            {money(nextAmount)}/mo · charged automatically each month
          </p>
          <p className="mt-2 flex items-center gap-1.5 font-tech text-xs text-primary/55">
            <ShieldCheck className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
            Secure card on file · cancel anytime
          </p>
        </div>
        {autopayOn ? (
          <div className="border border-hairline px-4 py-3 text-right">
            <p className="font-tech text-[10px] uppercase tracking-widest text-primary/50">
              {willCancel ? "Ends on" : "Next charge"}
            </p>
            <p className="mt-1 font-display text-lg uppercase tracking-tight">
              {nextDate
                ? nextDate.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
                : "Pending"}
            </p>
            {!willCancel && (
              <p className="font-tech text-sm text-primary/70">{money(nextAmount)}</p>
            )}
          </div>
        ) : (
          <button
            type="button"
            disabled={!PAYMENTS_ENABLED || !plan}
            onClick={() => setOpen(true)}
            className="btn-quote px-5 py-3 text-[11px] font-bold uppercase tracking-wide disabled:opacity-50"
          >
            <CreditCard className="mr-1.5 inline h-3.5 w-3.5" aria-hidden="true" />
            Enable autopay
          </button>
        )}
      </div>

      {autopayOn && sub?.status === "past_due" && (
        <p className="mt-3 font-tech text-xs text-primary/70">
          Last payment didn’t go through — we’ll retry automatically. Call (469) 744-0379 to update your card.
        </p>
      )}

      {willCancel && (
        <p className="mt-3 font-tech text-xs text-primary/60">
          Autopay is set to end after this billing period — no further charges after that date.
        </p>
      )}

      {!PAYMENTS_ENABLED && !autopayOn && (
        <p className="mt-3 font-tech text-xs text-primary/60">
          Card payments are temporarily unavailable — call (469) 744-0379 to set up autopay.
        </p>
      )}


      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Enable autopay</DialogTitle>
            <DialogDescription>
              {money(pool.monthly_price)} per month for {plan?.plan_name ?? "your pool service"}. You can cancel
              at any time.
            </DialogDescription>
          </DialogHeader>
          {open && plan ? (
            <EmbeddedCheckoutProvider stripe={getStripe()} options={{ fetchClientSecret }}>
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
          ) : (
            <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading your plan…
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
