import { createFileRoute } from "@tanstack/react-router";
import { recordAudit } from "@/lib/audit.server";

/**
 * Twilio status callback for contract signing-link texts.
 *
 * The callback URL we register with Twilio carries an unguessable shared
 * secret (`?k=...`). Requests without a matching secret are rejected, so
 * nobody who merely guesses a MessageSid can forge delivery statuses.
 *
 * Every verification attempt (pass or fail) is logged twice:
 *  - structured JSON to the server log for live tailing / alerting
 *  - an append-only row in ss_security_audit for the CRM Audit Trail
 */
function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

type Reason =
  | "secret_not_configured"
  | "token_missing"
  | "token_length_mismatch"
  | "token_mismatch"
  | "verified";

function clientIp(request: Request) {
  return (
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    null
  );
}

function log(event: string, payload: Record<string, unknown>) {
  console.log(
    JSON.stringify({ scope: "twilio.status_webhook", event, at: new Date().toISOString(), ...payload }),
  );
}

export const Route = createFileRoute("/api/public/twilio/contract-sms-status")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const startedAt = Date.now();
        const ip = clientIp(request);
        const userAgent = request.headers.get("user-agent")?.slice(0, 300) ?? null;
        // Twilio signs callbacks with X-Twilio-Signature; we track its presence as a
        // secondary signal even though the shared callback token is the gate.
        const hasTwilioSignature = Boolean(request.headers.get("x-twilio-signature"));

        const deny = async (reason: Reason, message: string) => {
          log("verification_failed", { reason, ip, userAgent, hasTwilioSignature });
          await recordAudit({
            action: "twilio_status_webhook.rejected",
            actorLabel: "twilio",
            success: false,
            outcome: message,
            details: {
              reason,
              hasTwilioSignature,
              durationMs: Date.now() - startedAt,
            },
            request,
          });
          return new Response("Forbidden", { status: 403 });
        };

        try {
          const expected = process.env["TWILIO_STATUS_WEBHOOK_SECRET"];
          if (!expected) {
            console.error("contract-sms-status: TWILIO_STATUS_WEBHOOK_SECRET is not configured");
            return await deny("secret_not_configured", "Webhook secret is not configured");
          }

          const provided = new URL(request.url).searchParams.get("k") ?? "";
          if (!provided) return await deny("token_missing", "Missing callback token");
          if (provided.length !== expected.length)
            return await deny("token_length_mismatch", "Invalid callback token");
          if (!safeEqual(provided, expected))
            return await deny("token_mismatch", "Invalid callback token");

          log("verification_passed", { ip, hasTwilioSignature });

          const form = await request.formData();
          const sid = String(form.get("MessageSid") ?? "");
          const status = String(form.get("MessageStatus") ?? "");
          if (!sid || !status) {
            log("payload_incomplete", { ip, sid: sid || null, status: status || null });
            return new Response("ok");
          }

          const errorCode = form.get("ErrorCode");
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

          const { data: existing } = await supabaseAdmin
            .from("ss_contract_sms")
            .select("id, contract_id")
            .eq("message_sid", sid)
            .maybeSingle();
          if (!existing) {
            log("message_not_found", { ip, sid });
            await recordAudit({
              action: "twilio_status_webhook.ignored",
              actorLabel: "twilio",
              subjectTable: "ss_contract_sms",
              subjectId: sid,
              success: true,
              outcome: "No matching message on file",
              details: { reason: "unknown_message_sid", hasTwilioSignature },
              request,
            });
            return new Response("ok");
          }

          // Tenant attribution: every applied status carries the customer it
          // belongs to, so the Audit Trail can rank failures per account.
          let customerId: string | null = null;
          let customerName: string | null = null;
          const { data: contract } = await supabaseAdmin
            .from("ss_contracts")
            .select("customer_id, recipient_name")
            .eq("id", existing.contract_id)
            .maybeSingle();
          if (contract) {
            customerId = contract.customer_id ?? null;
            customerName = contract.recipient_name ?? null;
            if (customerId) {
              const { data: customer } = await supabaseAdmin
                .from("ss_customers")
                .select("full_name")
                .eq("id", customerId)
                .maybeSingle();
              customerName = customer?.full_name ?? customerName;
            }
          }

          await supabaseAdmin
            .from("ss_contract_sms")
            .update({
              status: status.slice(0, 40),
              error_message: errorCode ? `Twilio error ${String(errorCode).slice(0, 20)}` : null,
            })
            .eq("id", existing.id);

          const deliveryFailed = ["failed", "undelivered"].includes(status.toLowerCase());

          log("status_applied", {
            ip,
            sid,
            status,
            customerId,
            errorCode: errorCode ? String(errorCode) : null,
          });

          await recordAudit({
            action: "twilio_status_webhook.applied",
            actorLabel: "twilio",
            subjectTable: "ss_contract_sms",
            subjectId: existing.id,
            success: !deliveryFailed,
            outcome: `Status set to ${status}`,
            details: {
              messageSid: sid,
              status,
              deliveryFailed,
              customerId,
              customerName,
              contractId: existing.contract_id,
              errorCode: errorCode ? String(errorCode) : null,
              hasTwilioSignature,
              durationMs: Date.now() - startedAt,
            },

            request,
          });

          return new Response("ok");
        } catch (e) {
          console.error("contract-sms-status error", e);
          log("handler_error", { ip, message: (e as Error).message });
          await recordAudit({
            action: "twilio_status_webhook.failed",
            actorLabel: "twilio",
            success: false,
            outcome: (e as Error).message,
            details: { reason: "handler_error", hasTwilioSignature },
            request,
          });
          return new Response("ok");
        }
      },
    },
  },
});
