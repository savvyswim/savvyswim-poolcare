import { useEffect, useMemo, useState } from "react";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { supabase } from "@/integrations/supabase/client";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, CheckCircle2 } from "lucide-react";

export type PricingRow = {
  id: string;
  pool_size: string;
  size_rank: number;
  vegetation_level: string;
  vegetation_rank: number;
  sku: string;
  price: number | null;
  price_key: string | null;
};

interface SubscribeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planName?: string;
}

export function SubscribeDialog({ open, onOpenChange, planName }: SubscribeDialogProps) {
  const [rows, setRows] = useState<PricingRow[]>([]);
  const [size, setSize] = useState<string>("");
  const [veg, setVeg] = useState<string>("");
  const [form, setForm] = useState({ name: "", email: "", phone: "", address: "", notes: "" });
  const [submitting, setSubmitting] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    supabase
      .from("service_pricing")
      .select("id,pool_size,size_rank,vegetation_level,vegetation_rank,sku,price,price_key")
      .eq("is_active", true)
      .order("size_rank")
      .order("vegetation_rank")
      .then(({ data, error }) => {
        if (error) return toast.error("Could not load pricing");
        const list = (data ?? []) as PricingRow[];
        setRows(list);
        if (list.length) {
          setSize((s) => s || list[0].pool_size);
        }
      });
  }, [open]);

  useEffect(() => {
    if (!open) {
      setClientSecret(null);
      setSubmitting(false);
    }
  }, [open]);

  const sizes = useMemo(
    () => [...new Map(rows.map((r) => [r.pool_size, r.size_rank])).entries()]
      .sort((a, b) => a[1] - b[1])
      .map(([name]) => name),
    [rows],
  );

  const vegOptions = useMemo(
    () => rows.filter((r) => r.pool_size === size).sort((a, b) => a.vegetation_rank - b.vegetation_rank),
    [rows, size],
  );

  useEffect(() => {
    if (vegOptions.length && !vegOptions.some((v) => v.vegetation_level === veg)) {
      setVeg(vegOptions[0].vegetation_level);
    }
  }, [vegOptions, veg]);

  const selected = vegOptions.find((v) => v.vegetation_level === veg) ?? null;

  const startCheckout = async () => {
    if (!selected?.price_key) return toast.error("Pick your pool size and vegetation level");
    if (form.name.trim().length < 2) return toast.error("Please enter your name");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email.trim()))
      return toast.error("Please enter a valid email");

    setSubmitting(true);
    const { data, error } = await supabase.functions.invoke("create-subscription-checkout", {
      body: {
        priceKey: selected.price_key,
        customerName: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        notes: form.notes.trim(),
        environment: getStripeEnvironment(),
        returnUrl: `${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}&plan=service`,
      },
    });
    setSubmitting(false);

    if (error || !data?.clientSecret) {
      return toast.error(error?.message || data?.error || "Could not start checkout");
    }
    setClientSecret(data.clientSecret);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[92vh] overflow-y-auto">
        {clientSecret ? (
          <>
            <DialogHeader>
              <DialogTitle>Complete your monthly service</DialogTitle>
              <DialogDescription>
                {selected?.pool_size} pool · {selected?.vegetation_level} — ${selected?.price}/month
              </DialogDescription>
            </DialogHeader>
            <div id="subscription-checkout">
              <EmbeddedCheckoutProvider
                stripe={getStripe()}
                options={{ fetchClientSecret: async () => clientSecret }}
              >
                <EmbeddedCheckout />
              </EmbeddedCheckoutProvider>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{planName ?? "Start monthly pool service"}</DialogTitle>
              <DialogDescription>
                Your price depends on pool size and how much vegetation surrounds it. Billed
                monthly, cancel anytime.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5">
              <div className="space-y-2">
                <Label>Pool size</Label>
                <div className="grid grid-cols-3 gap-2">
                  {sizes.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSize(s)}
                      className={`rounded-md border px-3 py-2 text-sm font-medium transition ${
                        size === s
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-border text-muted-foreground hover:border-primary/50"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Trees & vegetation around the pool</Label>
                <div className="grid gap-2">
                  {vegOptions.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setVeg(v.vegetation_level)}
                      className={`flex items-center justify-between rounded-md border px-3 py-2.5 text-sm transition ${
                        veg === v.vegetation_level
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        {veg === v.vegetation_level && (
                          <CheckCircle2 className="h-4 w-4 text-primary" />
                        )}
                        {v.vegetation_level}
                      </span>
                      <span className="font-semibold">${v.price}/mo</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="sub-name">Full name</Label>
                  <Input
                    id="sub-name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sub-email">Email</Label>
                  <Input
                    id="sub-email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sub-phone">Phone</Label>
                  <Input
                    id="sub-phone"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sub-address">Service address</Label>
                  <Input
                    id="sub-address"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="sub-notes">Gate code or notes (optional)</Label>
                <Textarea
                  id="sub-notes"
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>

              <div className="flex items-center justify-between rounded-md bg-muted/40 px-4 py-3">
                <span className="text-sm text-muted-foreground">Your monthly price</span>
                <span className="text-xl font-semibold">
                  {selected?.price != null ? `$${selected.price}/mo` : "—"}
                </span>
              </div>

              <Button className="w-full" onClick={startCheckout} disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Continue to payment
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
