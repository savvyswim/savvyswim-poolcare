import { createFileRoute } from "@tanstack/react-router";
import { recordAudit } from "@/lib/audit.server";

/**
 * Twilio status callback for contract signing-link texts.
 *
 * The callback URL we register with Twilio carries an unguessable shared
 * secret (`?k=...`). Requests without a matching secret are rejected, so
 * nobody who merely guesses a MessageSid can forge delivery statuses.
 */
function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export const Route = createFileRoute("/api/public/twilio/contract-sms-status")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const expected = process.env["TWILIO_STATUS_WEBHOOK_SECRET"];
          if (!expected) {
            console.error("contract-sms-status: TWILIO_STATUS_WEBHOOK_SECRET is not configured");
            await recordAudit({
              action: "twilio_status_webhook.rejected",
              actorLabel: "twilio",
              success: false,
              outcome: "Webhook secret is not configured",
              request,
            });
            return new Response("Forbidden", { status: 403 });
          }

          const provided = new URL(request.url).searchParams.get("k") ?? "";
          if (!provided || !safeEqual(provided, expected)) {
            await recordAudit({
              action: "twilio_status_webhook.rejected",
              actorLabel: "twilio",
              success: false,
              outcome: "Invalid or missing webhook secret",
              request,
            });
            return new Response("Forbidden", { status: 403 });
          }

          const form = await request.formData();
          const sid = String(form.get("MessageSid") ?? "");
          const status = String(form.get("MessageStatus") ?? "");
          if (!sid || !status) return new Response("ok");

          const errorCode = form.get("ErrorCode");
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

          const { data: existing } = await supabaseAdmin
            .from("ss_contract_sms")
            .select("id")
            .eq("message_sid", sid)
            .maybeSingle();
          if (!existing) {
            await recordAudit({
              action: "twilio_status_webhook.ignored",
              actorLabel: "twilio",
              subjectTable: "ss_contract_sms",
              subjectId: sid,
              success: true,
              outcome: "No matching message on file",
              request,
            });
            return new Response("ok");
          }

          await supabaseAdmin
            .from("ss_contract_sms")
            .update({
              status: status.slice(0, 40),
              error_message: errorCode ? `Twilio error ${String(errorCode).slice(0, 20)}` : null,
            })
            .eq("id", existing.id);

          await recordAudit({
            action: "twilio_status_webhook.applied",
            actorLabel: "twilio",
            subjectTable: "ss_contract_sms",
            subjectId: existing.id,
            success: true,
            outcome: `Status set to ${status}`,
            details: { messageSid: sid, errorCode: errorCode ? String(errorCode) : null },
            request,
          });

          return new Response("ok");
        } catch (e) {
          console.error("contract-sms-status error", e);
          await recordAudit({
            action: "twilio_status_webhook.failed",
            actorLabel: "twilio",
            success: false,
            outcome: (e as Error).message,
            request,
          });
          return new Response("ok");
        }
      },
    },
  },
});
