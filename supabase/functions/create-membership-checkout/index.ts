import { type StripeEnv, createStripeClient } from "../_shared/stripe.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PRICE_KEY = "savvy_membership_monthly";

const clean = (v: unknown, max: number) =>
  typeof v === "string" ? v.trim().slice(0, max) : "";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { returnUrl, environment } = body;

    if (environment !== "sandbox" && environment !== "live") {
      throw new Error("Invalid environment");
    }
    if (typeof returnUrl !== "string" || !/^https?:\/\//.test(returnUrl)) {
      throw new Error("Invalid return URL");
    }

    const customerName = clean(body.customerName, 120);
    const email = clean(body.email, 200).toLowerCase();
    const phone = clean(body.phone, 40);
    const address = clean(body.address, 300);

    if (customerName.length < 2) throw new Error("Please enter your name");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("Please enter a valid email");

    const stripe = createStripeClient(environment as StripeEnv);

    const prices = await stripe.prices.list({ lookup_keys: [PRICE_KEY], active: true });
    const stripePrice = prices.data[0];
    if (!stripePrice) throw new Error("Membership price not configured");

    const existing = await stripe.customers.list({ email, limit: 1 });
    const customer = existing.data[0]
      ? existing.data[0]
      : await stripe.customers.create({
          email,
          name: customerName,
          ...(phone ? { phone } : {}),
        });

    const session = await stripe.checkout.sessions.create({
      line_items: [{ price: stripePrice.id, quantity: 1 }],
      mode: "subscription",
      ui_mode: "embedded_page",
      return_url: returnUrl,
      customer: customer.id,
      metadata: {
        product: "savvy_membership",
        service_address: address || "",
        agreement_months: "12",
        agreed_to_terms: body.agreedToTerms === true ? "true" : "false",
        agreement_start: new Date().toISOString(),
      },
      subscription_data: {
        metadata: {
          product: "savvy_membership",
          service_address: address || "",
          agreement_months: "12",
          agreed_to_terms: body.agreedToTerms === true ? "true" : "false",
          agreement_start: new Date().toISOString(),
        },
      },
    });

    return new Response(JSON.stringify({ clientSecret: session.client_secret }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("create-membership-checkout error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
