import { useEffect, useState } from "react";
import { z } from "zod";
import { Minus, Plus, ShoppingBag, Trash2, Loader2 } from "lucide-react";
import { StripeEmbeddedCheckout } from "@/components/StripeEmbeddedCheckout";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCart, money } from "@/hooks/useCart";

const schema = z.object({
  customer_name: z.string().trim().min(2, "Enter your full name").max(120),
  email: z.string().trim().email("Enter a valid email").max(200),
  phone: z.string().trim().max(40).optional(),
  address: z.string().trim().max(300).optional(),
  city: z.string().trim().max(120).optional(),
  state: z.string().trim().max(60).optional(),
  postal_code: z.string().trim().max(20).optional(),
  notes: z.string().trim().max(2000).optional(),
});

const EMPTY = {
  customer_name: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  state: "TX",
  postal_code: "",
  notes: "",
};

export const CartDrawer = () => {
  const { lines, open, setOpen, setQty, remove, clear, subtotal, shipping, count } = useCart();
  const [step, setStep] = useState<"cart" | "checkout">("cart");
  const [form, setForm] = useState(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [placed, setPlaced] = useState<string | null>(null);
  const [promoInput, setPromoInput] = useState("");
  const [promo, setPromo] = useState<{ code: string; discount: number } | null>(null);
  const [checkingPromo, setCheckingPromo] = useState(false);

  // Discount, tax and total mirror the server-side calculation in place_store_order.
  const discount = Math.min(promo?.discount ?? 0, subtotal);
  const taxable = Math.max(subtotal - discount, 0);
  const tax = Math.round(taxable * 0.0825 * 100) / 100;
  const total = Math.round((taxable + tax + shipping) * 100) / 100;

  // A changing cart invalidates a previously calculated discount.
  useEffect(() => {
    setPromo(null);
  }, [subtotal]);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const applyPromo = async () => {
    const code = promoInput.trim();
    if (!code) return;
    setCheckingPromo(true);
    const { data, error } = await supabase.functions.invoke("store-order", {
      body: { action: "check_promo", code, subtotal },
    });

    setCheckingPromo(false);
    const result = data as { valid?: boolean; code?: string; discount?: number; message?: string } | null;
    if (error || !result?.valid) {
      setPromo(null);
      toast.error(result?.message ?? "We couldn't apply that code");
      return;
    }
    setPromo({ code: result.code!, discount: Number(result.discount) || 0 });
    toast.success(`${result.code} applied`);
  };

  const removePromo = () => {
    setPromo(null);
    setPromoInput("");
  };

  const close = (v: boolean) => {
    setOpen(v);
    if (!v) {
      setTimeout(() => {
        setStep("cart");
        setPlaced(null);
      }, 250);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }
    if (!lines.length) return;
    setSubmitting(true);

    const { data, error } = await supabase.functions.invoke("store-order", {
      body: {
        action: "place_order",
        customer_name: parsed.data.customer_name,
        email: parsed.data.email,
        phone: parsed.data.phone ?? null,
        address: parsed.data.address ?? null,
        city: parsed.data.city ?? null,
        state: parsed.data.state ?? null,
        postal_code: parsed.data.postal_code ?? null,
        notes: parsed.data.notes ?? null,
        items: lines.map((l) => ({ product_id: l.product_id, quantity: l.quantity })),
        promo_code: promo?.code ?? null,
      },
    });

    const orderNumber = (data as { order_number?: string } | null)?.order_number;

    setSubmitting(false);
    if (error || !orderNumber) {
      toast.error("We couldn't place your order. Call (469) 213-8087 and we'll take it by phone.");
      return;
    }

    setPlaced(orderNumber);
    clear();
    removePromo();
    toast.success(`Order ${orderNumber} received — pay securely below`);

  };

  return (
    <Sheet open={open} onOpenChange={close}>
      <SheetContent className="w-full sm:max-w-md flex flex-col overflow-y-auto">
        {placed ? (
          <div className="flex flex-1 flex-col gap-4 py-4">
            <SheetHeader>
              <SheetTitle>Pay for order {placed}</SheetTitle>
              <SheetDescription>
                Secure card payment. Your order is marked paid automatically as soon as the
                payment goes through.
              </SheetDescription>
            </SheetHeader>
            <PaymentTestModeBanner />
            <StripeEmbeddedCheckout orderNumber={placed} />
            <p className="text-xs text-muted-foreground pb-6">
              Prefer to pay later? Your order {placed} is already saved — call{" "}
              <a href="tel:+14692138087" className="font-semibold text-foreground">
                (469) 213-8087
              </a>{" "}
              and we'll invoice you instead.
            </p>
          </div>
        ) : step === "cart" ? (
          <>
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5" /> Your cart ({count})
              </SheetTitle>
              <SheetDescription>
                Free DFW delivery on orders over {money(500)}. Nothing is charged until we confirm
                stock.
              </SheetDescription>
            </SheetHeader>

            {lines.length === 0 ? (
              <div className="flex-1 grid place-items-center text-sm text-muted-foreground">
                Your cart is empty.
              </div>
            ) : (
              <>
                <div className="flex-1 space-y-4 py-4">
                  {lines.map((l) => (
                    <div key={l.sku ?? l.name} className="flex gap-3 border-b border-hairline pb-4">
                      <img
                        src={l.image}
                        alt={l.name}
                        className="h-16 w-16 rounded-sm object-cover"
                        loading="lazy"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold leading-snug">{l.name}</p>
                        <p className="text-xs text-muted-foreground">{l.sku}</p>
                        <div className="mt-2 flex items-center gap-2">
                          <button
                            type="button"
                            aria-label="Decrease quantity"
                            onClick={() => setQty(l.sku ?? l.name, l.quantity - 1)}
                            className="h-7 w-7 grid place-items-center rounded-sm border border-hairline hover:bg-muted"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-6 text-center text-sm font-semibold">{l.quantity}</span>
                          <button
                            type="button"
                            aria-label="Increase quantity"
                            onClick={() => setQty(l.sku ?? l.name, l.quantity + 1)}
                            className="h-7 w-7 grid place-items-center rounded-sm border border-hairline hover:bg-muted"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            aria-label="Remove item"
                            onClick={() => remove(l.sku ?? l.name)}
                            className="ml-auto text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      <div className="text-sm font-bold">{money(l.price * l.quantity)}</div>
                    </div>
                  ))}
                </div>

                <div className="border-t border-hairline pt-4 space-y-1.5 text-sm">
                  <div className="flex gap-2 pb-2">
                    <Input
                      value={promoInput}
                      onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                      placeholder="Promo code"
                      aria-label="Promo code"
                      className="h-9"
                    />
                    {promo ? (
                      <Button type="button" variant="outline" className="h-9" onClick={removePromo}>
                        Remove
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        className="h-9"
                        onClick={applyPromo}
                        disabled={checkingPromo || !promoInput.trim()}
                      >
                        {checkingPromo && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                        Apply
                      </Button>
                    )}
                  </div>
                  <Row label="Subtotal" value={money(subtotal)} />
                  {discount > 0 && (
                    <Row label={`Promo ${promo?.code}`} value={`−${money(discount)}`} />
                  )}
                  <Row label="Estimated tax" value={money(tax)} />
                  <Row label="Delivery" value={shipping === 0 ? "Free" : money(shipping)} />
                  <div className="flex justify-between pt-2 text-base font-bold">
                    <span>Total</span>
                    <span>{money(total)}</span>
                  </div>
                  <Button className="w-full mt-4" onClick={() => setStep("checkout")}>
                    Checkout
                  </Button>
                </div>
              </>
            )}
          </>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-3">
            <SheetHeader>
              <SheetTitle>Checkout</SheetTitle>
              <SheetDescription>
                {count} item{count === 1 ? "" : "s"} · {money(total)} total
              </SheetDescription>
            </SheetHeader>

            <Field id="customer_name" label="Full name" value={form.customer_name} onChange={set} required />
            <Field id="email" label="Email" type="email" value={form.email} onChange={set} required />
            <Field id="phone" label="Phone" value={form.phone} onChange={set} />
            <Field id="address" label="Delivery address" value={form.address} onChange={set} />
            <div className="grid grid-cols-3 gap-2">
              <Field id="city" label="City" value={form.city} onChange={set} />
              <Field id="state" label="State" value={form.state} onChange={set} />
              <Field id="postal_code" label="ZIP" value={form.postal_code} onChange={set} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="notes">Order notes</Label>
              <Textarea
                id="notes"
                rows={3}
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                placeholder="Pool size, equipment brand, delivery instructions…"
              />
            </div>

            <div className="border-t border-hairline pt-3 space-y-1.5 text-sm">
              <Row label="Subtotal" value={money(subtotal)} />
              {discount > 0 && (
                <Row label={`Promo ${promo?.code}`} value={`−${money(discount)}`} />
              )}
              <Row label="Estimated tax" value={money(tax)} />
              <Row label="Delivery" value={shipping === 0 ? "Free" : money(shipping)} />
              <div className="flex justify-between pt-1 text-base font-bold">
                <span>Total</span>
                <span>{money(total)}</span>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Next step is secure card payment. Your order is confirmed and marked paid as soon as
              the payment clears.
            </p>

            <div className="flex gap-2 pb-6">
              <Button type="button" variant="outline" onClick={() => setStep("cart")}>
                Back
              </Button>
              <Button type="submit" className="flex-1" disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Place order
              </Button>
            </div>
          </form>
        )}
      </SheetContent>
    </Sheet>
  );
};

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between text-muted-foreground">
    <span>{label}</span>
    <span className="text-foreground">{value}</span>
  </div>
);

const Field = ({
  id,
  label,
  value,
  onChange,
  type = "text",
  required,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (k: string, v: string) => void;
  type?: string;
  required?: boolean;
}) => (
  <div className="space-y-1.5">
    <Label htmlFor={id}>
      {label} {required && <span className="text-destructive">*</span>}
    </Label>
    <Input id={id} type={type} value={value} onChange={(e) => onChange(id, e.target.value)} />
  </div>
);
