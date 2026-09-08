import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Admin webhook health.
 *
 * Reads the unified delivery log (leads, appointments, payments) and lets the
 * office retry a failed delivery. Office/owner only, verified server-side
 * against ss_is_office(), never from the client.
 */

export type WebhookDeliveryRow = {
  id: string;
  channel: "lead" | "appointment" | "payment";
  direction: string;
  event_key: string | null;
  endpoint: string | null;
  reference: string | null;
  outcome: string;
  http_status: number | null;
  attempts: number;
  last_error: string | null;
  response: string | null;
  retried_at: string | null;
  created_at: string;
  last_attempt_at: string;
};

export type ChannelHealth = {
  channel: "lead" | "appointment" | "payment";
  total24h: number;
  failed24h: number;
  total7d: number;
  failed7d: number;
  retried7d: number;
  successRate24h: number | null;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
};

export type WebhookAlertRow = {
  id: string;
  alert_key: string;
  alert_type: string;
  channel: string | null;
  summary: string;
  total_events: number;
  failed_events: number;
  failure_rate: number;
  baseline: number | null;
  alert_result: string | null;
  alert_count: number;
  last_alerted_at: string;
};

const CHANNELS = ["lead", "appointment", "payment"] as const;

async function assertOffice(supabase: {
  rpc: (fn: "ss_is_office") => Promise<{ data: unknown; error: unknown }>;
}) {
  const { data } = await supabase.rpc("ss_is_office");
  if (data !== true) throw new Error("Office access required");
}

export const getWebhookHealth = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertOffice(context.supabase as never);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const since7d = new Date(Date.now() - 7 * 864e5).toISOString();
    const since24h = new Date(Date.now() - 864e5).toISOString();

    const { data, error } = await supabaseAdmin
      .from("ss_webhook_deliveries")
      .select(
        "id, channel, direction, event_key, endpoint, reference, outcome, http_status, attempts, last_error, response, retried_at, created_at, last_attempt_at",
      )
      .gte("last_attempt_at", since7d)
      .order("last_attempt_at", { ascending: false })
      .limit(400);
    if (error) throw new Error(error.message);

    const rows = (data ?? []) as WebhookDeliveryRow[];

    const health: ChannelHealth[] = CHANNELS.map((channel) => {
      const forChannel = rows.filter((r) => r.channel === channel);
      const last24 = forChannel.filter((r) => r.last_attempt_at >= since24h);
      const failed24 = last24.filter((r) => r.outcome === "failed");
      return {
        channel,
        total24h: last24.length,
        failed24h: failed24.length,
        total7d: forChannel.length,
        failed7d: forChannel.filter((r) => r.outcome === "failed").length,
        retried7d: forChannel.filter((r) => r.retried_at).length,
        successRate24h: last24.length
          ? Math.round(((last24.length - failed24.length) / last24.length) * 100)
          : null,
        lastSuccessAt: forChannel.find((r) => r.outcome === "success")?.last_attempt_at ?? null,
        lastFailureAt: forChannel.find((r) => r.outcome === "failed")?.last_attempt_at ?? null,
      };
    });

    const { data: alertRows } = await supabaseAdmin
      .from("ss_webhook_alerts")
      .select("id, alert_key, alert_type, channel, summary, total_events, failed_events, failure_rate, baseline, alert_result, alert_count, last_alerted_at")
      .order("last_alerted_at", { ascending: false })
      .limit(20);

    return {
      alerts: (alertRows ?? []) as WebhookAlertRow[],
      health,
      failures: rows.filter((r) => r.outcome === "failed").slice(0, 60),
      recent: rows.slice(0, 60),
      retries: rows.filter((r) => r.retried_at || r.attempts > 1).slice(0, 60),
    };
  });

export const retryWebhookDelivery = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertOffice(context.supabase as never);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("ss_webhook_deliveries")
      .select("id, channel, event_key, endpoint, reference, request")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Delivery not found");

    const { logWebhookDelivery } = await import("./webhook-log.server");
    const payload = (row.request ?? {}) as Record<string, unknown>;

    if (row.channel === "lead") {
      const endpoint =
        row.endpoint || process.env["CRM_LEADS_URL"] || "https://savvyswim.app/api/public/leads";
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      const token = process.env["CRM_LEADS_TOKEN"];
      if (token) headers["Authorization"] = `Bearer ${token}`;
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
        });
        const body = await res.text();
        await logWebhookDelivery({
          channel: "lead",
          eventKey: row.event_key,
          endpoint,
          reference: row.reference,
          outcome: res.ok ? "success" : "failed",
          httpStatus: res.status,
          error: res.ok ? null : `CRM responded ${res.status}`,
          request: payload,
          response: body,
          isRetry: true,
          retriedBy: context.userId,
        });
        return { ok: res.ok, status: res.status, detail: body.slice(0, 300) };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        await logWebhookDelivery({
          channel: "lead",
          eventKey: row.event_key,
          endpoint,
          reference: row.reference,
          outcome: "failed",
          httpStatus: 0,
          error: message,
          request: payload,
          isRetry: true,
          retriedBy: context.userId,
        });
        return { ok: false, status: 0, detail: message };
      }
    }

    // Inbound channels: replay the customer notification from the stored payload.
    if (row.channel === "appointment") {
      const {
        normalizeStatus,
        sendStatusEmail,
        sendStatusSms,
        smsBody,
      } = await import("./appointment-status-notify.server");
      const customer = (payload["customer"] ?? {}) as Record<string, unknown>;
      const status = normalizeStatus(payload["status"]);
      if (!status) return { ok: false, status: 400, detail: "Stored payload has no valid status" };
      const email =
        (typeof customer["email"] === "string" ? customer["email"] : (payload["email"] as string)) ?? null;
      const phone =
        (typeof customer["phone"] === "string" ? customer["phone"] : (payload["phone"] as string)) ?? null;
      const evt = {
        eventId: `${row.event_key ?? row.id}:retry:${Date.now()}`,
        appointmentId: (payload["appointment_id"] as string) ?? null,
        status,
        previousStatus: (payload["previous_status"] as string) ?? null,
        customerName:
          (typeof customer["name"] === "string" ? customer["name"] : (payload["customer_name"] as string)) ?? null,
        email,
        phone,
        scheduledDate: (payload["scheduled_date"] as string) ?? null,
        arrivalWindow: (payload["arrival_window"] as string) ?? null,
        technician: (payload["technician"] as string) ?? null,
        message: (payload["message"] as string) ?? null,
      };
      let sent = false;
      let detail = "no contact details on the stored payload";
      try {
        if (email) sent = await sendStatusEmail(email, evt);
        if (!sent && phone) sent = await sendStatusSms(phone, smsBody(evt));
        detail = sent ? "Notification re-sent" : "Delivery still failing";
      } catch (err) {
        detail = err instanceof Error ? err.message : String(err);
      }
      await logWebhookDelivery({
        channel: "appointment",
        direction: "inbound",
        eventKey: row.event_key,
        endpoint: row.endpoint,
        reference: row.reference,
        outcome: sent ? "success" : "failed",
        httpStatus: 200,
        error: sent ? null : detail,
        request: payload,
        response: detail,
        isRetry: true,
        retriedBy: context.userId,
      });
      return { ok: sent, status: 200, detail };
    }

    const { normalizePaymentStatus, sendPaymentEmail } = await import(
      "./payment-status-notify.server"
    );
    const customer = (payload["customer"] ?? {}) as Record<string, unknown>;
    const status = normalizePaymentStatus(payload["status"]);
    const email =
      (typeof customer["email"] === "string" ? customer["email"] : (payload["email"] as string)) ?? null;
    if (!status || !email) {
      return { ok: false, status: 400, detail: "Stored payload has no status or email" };
    }
    const rawAmount = payload["amount"];
    let sent = false;
    let detail = "Delivery still failing";
    try {
      sent = await sendPaymentEmail(email, {
        eventId: `${row.event_key ?? row.id}:retry:${Date.now()}`,
        invoiceNumber: (payload["invoice_number"] as string) ?? null,
        status,
        amount: typeof rawAmount === "number" ? rawAmount : Number(rawAmount) || null,
        customerName:
          (typeof customer["name"] === "string" ? customer["name"] : (payload["customer_name"] as string)) ?? null,
        email,
        method: (payload["method"] as string) ?? null,
        message: (payload["message"] as string) ?? null,
      });
      if (sent) detail = "Receipt re-sent";
    } catch (err) {
      detail = err instanceof Error ? err.message : String(err);
    }
    await logWebhookDelivery({
      channel: "payment",
      direction: "inbound",
      eventKey: row.event_key,
      endpoint: row.endpoint,
      reference: row.reference,
      outcome: sent ? "success" : "failed",
      httpStatus: 200,
      error: sent ? null : detail,
      request: payload,
      response: detail,
      isRetry: true,
      retriedBy: context.userId,
    });
    return { ok: sent, status: 200, detail };
  });
