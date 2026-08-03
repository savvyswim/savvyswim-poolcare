import { createClient } from "npm:@supabase/supabase-js@2";
import { type StripeEnv, verifyWebhook } from "../_shared/stripe.ts";

let _supabase: ReturnType<typeof createClient> | null = null;
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
  }
  return _supabase;
}

async function markPaid(session: any) {
  const orderId = session?.metadata?.order_id;
  const query = getSupabase()
    .from("store_orders")
    .update({
      payment_status: "paid",
      status: "paid",
      paid_at: new Date().toISOString(),
    });

  const { error } = orderId
    ? await query.eq("id", orderId)
    : await query.eq("stripe_session_id", session.id);

  if (error) console.error("Failed to mark order paid:", error);
}

async function markFailed(session: any) {
  const orderId = session?.metadata?.order_id;
  const query = getSupabase().from("store_orders").update({ payment_status: "failed" });
  const { error } = orderId
    ? await query.eq("id", orderId)
    : await query.eq("stripe_session_id", session.id);
  if (error) console.error("Failed to mark order failed:", error);
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const rawEnv = new URL(req.url).searchParams.get("env");
  if (rawEnv !== "sandbox" && rawEnv !== "live") {
    console.error("Webhook received with invalid env:", rawEnv);
    return new Response(JSON.stringify({ received: true, ignored: "invalid env" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
  const env: StripeEnv = rawEnv;

  try {
    const event = await verifyWebhook(req, env);
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        if (session.payment_status !== "unpaid") await markPaid(session);
        break;
      }
      case "checkout.session.async_payment_succeeded":
        await markPaid(event.data.object);
        break;
      case "checkout.session.async_payment_failed":
        await markFailed(event.data.object);
        break;
      default:
        console.log("Unhandled event:", event.type);
    }
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Webhook error:", e);
    return new Response("Webhook error", { status: 400 });
  }
});
