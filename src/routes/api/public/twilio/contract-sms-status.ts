import { createFileRoute } from "@tanstack/react-router";

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
            return new Response("Forbidden", { status: 403 });
          }

          const provided = new URL(request.url).searchParams.get("k") ?? "";
          if (!provided || !safeEqual(provided, expected)) {
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
          if (!existing) return new Response("ok");

          await supabaseAdmin
            .from("ss_contract_sms")
            .update({
              status: status.slice(0, 40),
              error_message: errorCode ? `Twilio error ${String(errorCode).slice(0, 20)}` : null,
            })
            .eq("id", existing.id);

          return new Response("ok");
        } catch (e) {
          console.error("contract-sms-status error", e);
          return new Response("ok");
        }
      },
    },
  },
});
