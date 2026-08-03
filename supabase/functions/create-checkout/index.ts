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

const cents = (n: number) => Math.round(Number(n) * 100);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const { orderNumber, returnUrl, environment } = await req.json();
    if (environment !== "sandbox" && environment !== "live") {
      throw new Error("Invalid environment");
    }
    if (typeof orderNumber !== "string" || !/^[A-Za-z0-9-]{3,40}$/.test(orderNumber)) {
      throw new Error("Invalid order");
    }
    if (typeof returnUrl !== "string" || !/^https?:\/\//.test(returnUrl)) {
      throw new Error("Invalid return URL");
    }

    const { data: order, error: orderError } = await supabase
      .from("store_orders")
      .select("id, order_number, email, customer_name, subtotal, tax, shipping, total, payment_status")
      .eq("order_number", orderNumber)
      .maybeSingle();

    if (orderError) throw orderError;
    if (!order) throw new Error("Order not found");
    if (order.payment_status === "paid") throw new Error("Order already paid");

    const { data: items, error: itemsError } = await supabase
      .from("store_order_items")
      .select("product_name, sku, unit_price, quantity")
      .eq("order_id", order.id);
    if (itemsError) throw itemsError;
    if (!items?.length) throw new Error("Order has no items");

    const line_items = items.map((it: any) => ({
      price_data: {
        currency: "usd",
        product_data: { name: it.product_name, ...(it.sku ? { description: `SKU ${it.sku}` } : {}) },
        unit_amount: cents(it.unit_price),
      },
      quantity: it.quantity,
    }));

    if (Number(order.shipping) > 0) {
      line_items.push({
        price_data: {
          currency: "usd",
          product_data: { name: "Delivery" },
          unit_amount: cents(order.shipping),
        },
        quantity: 1,
      });
    }
    if (Number(order.tax) > 0) {
      line_items.push({
        price_data: {
          currency: "usd",
          product_data: { name: "Sales tax (TX 8.25%)" },
          unit_amount: cents(order.tax),
        },
        quantity: 1,
      });
    }

    const stripe = createStripeClient(environment as StripeEnv);
    const session = await stripe.checkout.sessions.create({
      line_items,
      mode: "payment",
      ui_mode: "embedded_page",
      return_url: returnUrl,
      customer_email: order.email,
      payment_intent_data: { description: `Savvy Swim order ${order.order_number}` },
      metadata: { order_id: order.id, order_number: order.order_number },
    });

    await supabase
      .from("store_orders")
      .update({ stripe_session_id: session.id })
      .eq("id", order.id);

    return new Response(JSON.stringify({ clientSecret: session.client_secret }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("create-checkout error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
