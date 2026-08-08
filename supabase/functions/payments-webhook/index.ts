import { createClient } from "npm:@supabase/supabase-js@2";
import { type StripeEnv, verifyWebhook } from "../_shared/stripe.ts";
import { recordAudit } from "../_shared/audit.ts";

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


function isoFromUnix(seconds: number | null | undefined): string | null {
  return seconds ? new Date(seconds * 1000).toISOString() : null;
}

async function upsertSubscription(sub: any, env: StripeEnv) {
  const rowId = sub?.metadata?.subscription_row_id ?? null;
  const item = sub?.items?.data?.[0];
  const periodEnd = item?.current_period_end ?? sub?.current_period_end;

  const patch: Record<string, unknown> = {
    stripe_subscription_id: sub.id,
    stripe_customer_id: typeof sub.customer === "string" ? sub.customer : sub.customer?.id,
    environment: env,
    status: sub.status,
    current_period_end: isoFromUnix(periodEnd),
    cancel_at_period_end: sub.cancel_at_period_end ?? false,
    canceled_at: isoFromUnix(sub.canceled_at),
  };
  if (item?.price?.lookup_key) patch.price_key = item.price.lookup_key;
  if (typeof item?.price?.unit_amount === "number") patch.amount = item.price.unit_amount / 100;

  const client = getSupabase();
  if (rowId) {
    const { error } = await client.from("subscriptions").update(patch).eq("id", rowId);
    if (error) console.error("Failed to update subscription row:", error);
    return;
  }
  const { error } = await client
    .from("subscriptions")
    .upsert(patch, { onConflict: "stripe_subscription_id" });
  if (error) console.error("Failed to upsert subscription:", error);
}

async function linkSubscriptionSession(session: any, env: StripeEnv) {
  const rowId = session?.metadata?.subscription_row_id;
  if (!rowId || !session.subscription) return;
  const { error } = await getSupabase()
    .from("subscriptions")
    .update({
      stripe_subscription_id: typeof session.subscription === "string"
        ? session.subscription
        : session.subscription.id,
      environment: env,
      status: "active",
    })
    .eq("id", rowId);
  if (error) console.error("Failed to link subscription session:", error);
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
    await recordAudit({
      action: "stripe_webhook.received",
      actorKind: "webhook",
      actorLabel: `stripe:${env}`,
      subjectTable: "stripe_event",
      subjectId: event.id,
      success: true,
      outcome: event.type,
      details: { env },
      request: req,
    });
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        if (session.mode === "subscription") {
          await linkSubscriptionSession(session, env);
        } else if (session.payment_status !== "unpaid") {
          await markPaid(session);
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
      case "customer.subscription.paused":
      case "customer.subscription.resumed":
        await upsertSubscription(event.data.object, env);
        break;
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
