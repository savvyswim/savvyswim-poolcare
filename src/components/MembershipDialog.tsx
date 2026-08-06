import { useState } from "react";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { getStripe, getStripeEnvironment, PAYMENTS_ENABLED } from "@/lib/stripe";
import { supabase } from "@/integrations/supabase/client";
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
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";

interface MembershipDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MembershipDialog({ open, onOpenChange }: MembershipDialogProps) {
  const [form, setForm] = useState({ name: "", email: "", phone: "", address: "" });
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  const start = async () => {
    if (form.name.trim().length < 2) return toast.error("Please enter your name");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email.trim()))
      return toast.error("Please enter a valid email");
    if (!agreed) return toast.error("Please accept the 12-month Swim Club agreement");
    if (!PAYMENTS_ENABLED) {
      return toast.info("Online payment is temporarily unavailable — call (469) 744-0379 to join.");
    }

    setLoading(true);

    const { data, error } = await supabase.functions.invoke("create-membership-checkout", {
      body: {
        customerName: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        agreementMonths: 12,
        agreedToTerms: true,
        environment: getStripeEnvironment(),
        returnUrl: `${window.location.origin}/?membership=success`,
      },
    });
    setLoading(false);

    if (error || !data?.clientSecret) {
      return toast.error(data?.error || error?.message || "Could not start checkout");
    }
    setClientSecret(data.clientSecret);
    return undefined;
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setClientSecret(null);
      setLoading(false);
      setAgreed(false);
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[92vh] overflow-y-auto">
        <PaymentTestModeBanner />
        {clientSecret ? (
          <div id="membership-checkout">
            <EmbeddedCheckoutProvider stripe={getStripe()} options={{ clientSecret }}>
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Savvy Swim Club — $19.99 / month</DialogTitle>
              <DialogDescription>
                Summer offer: new customers get their first service visit free on a 12-month
                agreement. Members also get 50% off one filter clean, 5%
                off parts, 7% off installation labor, and 24/7 text support. Billed monthly.
              </DialogDescription>
            </DialogHeader>


            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="mem-name">Full name</Label>
                <Input
                  id="mem-name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mem-email">Email</Label>
                <Input
                  id="mem-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mem-phone">Phone</Label>
                <Input
                  id="mem-phone"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mem-address">Service address</Label>
                <Input
                  id="mem-address"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                />
              </div>
            </div>

            <label className="flex items-start gap-3 rounded-lg border border-border bg-muted/40 p-3 text-xs leading-relaxed">
              <Checkbox
                checked={agreed}
                onCheckedChange={(v) => setAgreed(v === true)}
                className="mt-0.5"
              />
              <span>
                I agree to a 12-month Savvy Swim Club term at $19.99/month. My membership renews
                monthly during the term and may be cancelled at the end of the 12 months.
              </span>
            </label>

            <Button className="w-full" onClick={start} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Join — 12-month agreement"}
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
