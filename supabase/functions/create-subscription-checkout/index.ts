import { createClient } from "npm:@supabase/supabase-js@2";
import { type StripeEnv, createStripeClient } from "../_shared/stripe.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const clean = (v: unknown, max: number) =>
  typeof v === "string" ? v.trim().slice(0, max) : "";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { priceKey, returnUrl, environment } = body;

    if (environment !== "sandbox" && environment !== "live") {
      throw new Error("Invalid environment");
    }
    if (typeof priceKey !== "string" || !/^[a-z0-9_]{3,60}$/.test(priceKey)) {
      throw new Error("Invalid plan selection");
    }
    if (typeof returnUrl !== "string" || !/^https?:\/\//.test(returnUrl)) {
      throw new Error("Invalid return URL");
    }

    const customerName = clean(body.customerName, 120);
    const email = clean(body.email, 200).toLowerCase();
    const phone = clean(body.phone, 40);
    const address = clean(body.address, 300);
    const notes = clean(body.notes, 2000);

    if (customerName.length < 2) throw new Error("Please enter your name");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("Please enter a valid email");

    // Price + amount come from the database, never from the client.
    const { data: pricing, error: pricingError } = await supabase
      .from("service_pricing")
      .select("id, pool_size, vegetation_level, plan_name, sku, price, price_key, is_active")
      .eq("price_key", priceKey)
      .eq("is_active", true)
      .maybeSingle();

    if (pricingError) throw pricingError;
    if (!pricing || pricing.price == null) throw new Error("That plan is not available yet");

    const stripe = createStripeClient(environment as StripeEnv);

    const prices = await stripe.prices.list({ lookup_keys: [priceKey], active: true });
    const stripePrice = prices.data[0];
    if (!stripePrice) throw new Error("Plan price not configured");

    // Reuse an existing customer for this email so repeat sign-ups don't duplicate.
    const existing = await stripe.customers.list({ email, limit: 1 });
    const customer = existing.data[0]
      ? existing.data[0]
      : await stripe.customers.create({
          email,
          name: customerName,
          ...(phone ? { phone } : {}),
        });

    const planName =
      pricing.plan_name ?? `${pricing.pool_size} pool · ${pricing.vegetation_level}`;

    const { data: subRow, error: subError } = await supabase
      .from("subscriptions")
      .insert({
        stripe_customer_id: customer.id,
        environment,
        customer_name: customerName,
        email,
        phone: phone || null,
        address: address || null,
        plan_name: planName,
        pool_size: pricing.pool_size,
        price_key: priceKey,
        amount: pricing.price,
        status: "incomplete",
        notes: notes || null,
      })
      .select("id")
      .single();
    if (subError) throw subError;

    const session = await stripe.checkout.sessions.create({
      line_items: [{ price: stripePrice.id, quantity: 1 }],
      mode: "subscription",
      ui_mode: "embedded_page",
      return_url: returnUrl,
      customer: customer.id,
      metadata: {
        subscription_row_id: subRow.id,
        sku: pricing.sku,
        pool_size: pricing.pool_size,
        vegetation_level: pricing.vegetation_level,
      },
      subscription_data: {
        metadata: {
          subscription_row_id: subRow.id,
          sku: pricing.sku,
          service_address: address || "",
        },
      },
    });

    return new Response(
      JSON.stringify({ clientSecret: session.client_secret, planName, amount: pricing.price }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("create-subscription-checkout error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
