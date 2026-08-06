import { createFileRoute } from "@tanstack/react-router";

/**
 * Twilio status callback for contract signing-link texts.
 * Updates are only applied to a MessageSid that this app already recorded,
 * so unknown payloads are ignored.
 */
export const Route = createFileRoute("/api/public/twilio/contract-sms-status")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
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
              status,
              error_message: errorCode ? `Twilio error ${String(errorCode)}` : null,
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
