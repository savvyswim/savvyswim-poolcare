import { createFileRoute } from "@tanstack/react-router";

/**
 * Inbound SMS webhook (two-way texting).
 *
 * Twilio posts here whenever a customer replies. The callback URL we register
 * carries an unguessable shared secret (`?k=...`), so nobody can forge inbound
 * messages by guessing the path.
 *
 * Threads are keyed by phone number and auto-assigned to the technician who
 * runs that customer's route; the office can see and reply to every thread.
 */
function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

const escapeXml = (value: string) =>
  value.replace(/[<>&'"]/g, (c) =>
    ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c] ?? c,
  );

const twiml = (status = 200, reply?: string) =>
  new Response(
    `<?xml version="1.0" encoding="UTF-8"?><Response>${
      reply ? `<Message>${escapeXml(reply)}</Message>` : ""
    }</Response>`,
    { status, headers: { "Content-Type": "text/xml" } },
  );

function log(event: string, payload: Record<string, unknown>) {
  console.log(JSON.stringify({ scope: "twilio.inbound_sms", event, at: new Date().toISOString(), ...payload }));
}

export const Route = createFileRoute("/api/public/twilio/inbound")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expected = process.env["TWILIO_STATUS_WEBHOOK_SECRET"];
        const token = new URL(request.url).searchParams.get("k") ?? "";
        if (!expected || !token || !safeEqual(token, expected)) {
          log("verification_failed", { hasToken: Boolean(token) });
          return new Response("Unauthorized", { status: 401 });
        }

        const form = await request.formData();
        const from = String(form.get("From") ?? "").trim();
        const to = String(form.get("To") ?? "").trim();
        const body = String(form.get("Body") ?? "").trim().slice(0, 1500);
        const sid = String(form.get("MessageSid") ?? "").trim() || null;
        if (!from || !body) return twiml();

        const {
          classifySmsKeyword,
          recordSmsConsent,
          recordHelpRequest,
          SMS_HELP_REPLY,
          SMS_STOP_REPLY,
          SMS_START_REPLY,
        } = await import("@/lib/sms-compliance.server");

        // STOP / START / HELP are handled first and always answered the same way.
        const keyword = classifySmsKeyword(body);
        let autoReply: string | undefined;
        if (keyword === "stop") {
          await recordSmsConsent({ phone: from, optedIn: false, consentText: `Inbound reply: ${body}`, source: "sms_keyword_stop" });
          autoReply = SMS_STOP_REPLY;
          log("opt_out", { from: from.slice(-4) });
        } else if (keyword === "start") {
          await recordSmsConsent({ phone: from, optedIn: true, consentText: `Inbound reply: ${body}`, source: "sms_keyword_start" });
          autoReply = SMS_START_REPLY;
          log("opt_in", { from: from.slice(-4) });
        } else if (keyword === "help") {
          await recordHelpRequest(from);
          autoReply = SMS_HELP_REPLY;
          log("help", { from: from.slice(-4) });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        let { data: thread } = await supabaseAdmin
          .from("ss_sms_threads")
          .select("id, unread_count")
          .eq("phone", from)
          .maybeSingle();

        if (!thread) {
          const digits = from.replace(/\D/g, "").slice(-10);
          const { data: customer } = await supabaseAdmin
            .from("ss_customers")
            .select("id, full_name, assigned_tech_id, phone")
            .ilike("phone", `%${digits}%`)
            .limit(1)
            .maybeSingle();

          const { data: created, error } = await supabaseAdmin
            .from("ss_sms_threads")
            .insert({
              phone: from,
              customer_id: customer?.id ?? null,
              display_name: customer?.full_name ?? null,
              assigned_staff_id: customer?.assigned_tech_id ?? null,
            })
            .select("id, unread_count")
            .single();
          if (error) {
            console.error(`inbound sms: thread create failed: ${error.message}`);
            return twiml(200, autoReply);
          }
          thread = created;
        }

        await supabaseAdmin.from("ss_sms_messages").insert({
          thread_id: thread.id,
          direction: "in",
          body,
          from_number: from,
          to_number: to || null,
          status: "received",
          twilio_sid: sid,
        });

        await supabaseAdmin
          .from("ss_sms_threads")
          .update({
            unread_count: (thread.unread_count ?? 0) + 1,
            last_message_at: new Date().toISOString(),
            last_preview: body.slice(0, 140),
            status: "open",
          })
          .eq("id", thread.id);

        log("received", { threadId: thread.id, length: body.length, keyword });
        return twiml(200, autoReply);
      },
    },
  },
});
