import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { getStripe, getStripeEnvironment, PAYMENTS_ENABLED } from "@/lib/stripe";
import { supabase } from "@/integrations/supabase/client";

interface StripeEmbeddedCheckoutProps {
  orderNumber: string;
  returnUrl?: string;
}

export function StripeEmbeddedCheckout({ orderNumber, returnUrl }: StripeEmbeddedCheckoutProps) {
  if (!PAYMENTS_ENABLED) {
    return (
      <div className="rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
        Online card payment is temporarily unavailable. Your order{" "}
        <span className="font-semibold text-foreground">{orderNumber}</span> is saved — call{" "}
        <a href="tel:+14692138087" className="font-semibold text-foreground">
          (469) 213-8087
        </a>{" "}
        and we'll take payment or send an invoice.
      </div>
    );
  }


  const fetchClientSecret = async (): Promise<string> => {
    const { data, error } = await supabase.functions.invoke("create-checkout", {
      body: {
        orderNumber,
        returnUrl:
          returnUrl ??
          `${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}&order=${orderNumber}`,
        environment: getStripeEnvironment(),
      },
    });
    if (error || !data?.clientSecret) {
      throw new Error(error?.message || data?.error || "Failed to start payment");
    }
    return data.clientSecret;
  };

  return (
    <div id="checkout">
      <EmbeddedCheckoutProvider stripe={getStripe()} options={{ fetchClientSecret }}>
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}
