import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/twilio";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizePhone(raw: string) {
  const digits = raw.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) return digits;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const body = await req.json().catch(() => null);
    const requestId = typeof body?.requestId === "string" ? body.requestId : "";
    if (!/^[0-9a-f-]{36}$/i.test(requestId)) {
      return json({ error: "A valid requestId is required" }, 400);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: record, error } = await admin
      .from("inspection_requests")
      .select("id, full_name, phone, reference_number, sms_opt_in, created_at")
      .eq("id", requestId)
      .maybeSingle();

    if (error) {
      console.error("inspection lookup failed:", error.message);
      return json({ error: "Could not load the request" }, 500);
    }
    if (!record) return json({ error: "Request not found" }, 404);
    if (!record.sms_opt_in) return json({ sent: false, reason: "opted_out" });

    // Only confirm requests created in the last 15 minutes (prevents replay/abuse).
    if (Date.now() - new Date(record.created_at).getTime() > 15 * 60 * 1000) {
      return json({ sent: false, reason: "expired" });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const TWILIO_API_KEY = Deno.env.get("TWILIO_API_KEY");
    if (!LOVABLE_API_KEY || !TWILIO_API_KEY) {
      return json({ error: "SMS is not configured" }, 500);
    }

    const to = normalizePhone(record.phone ?? "");
    if (!to) return json({ error: "No valid phone number on the request" }, 400);

    const gwHeaders = {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": TWILIO_API_KEY,
    };

    const numbersRes = await fetch(`${GATEWAY_URL}/IncomingPhoneNumbers.json?PageSize=1`, {
      headers: gwHeaders,
    });
    if (!numbersRes.ok) {
      const details = await numbersRes.text();
      console.error(`Twilio numbers lookup failed [${numbersRes.status}]: ${details}`);
      return json({ error: "Could not reach Twilio", status: numbersRes.status, details }, numbersRes.status);
    }
    const numbers = await numbersRes.json();
    const from = numbers?.incoming_phone_numbers?.[0]?.phone_number;
    if (!from) return json({ error: "No Twilio phone number is available" }, 400);

    const firstName = (record.full_name ?? "").split(" ")[0] || "there";
    const message = [
      `Hi ${firstName} — Savvy Swim here. We got your free pool service request.`,
      `Reference: ${record.reference_number}`,
      "",
      "Next steps:",
      "1. A tech reviews your address and service address (within 1 business day).",
      "2. We text you 2 visit windows to pick from.",
      "3. The pool visit takes ~30 min, no cost, no obligation.",
      "",
      "Reply here anytime or call (469) 744-0379.",
    ].join("\n");

    const sendRes = await fetch(`${GATEWAY_URL}/Messages.json`, {
      method: "POST",
      headers: { ...gwHeaders, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ To: to, From: from, Body: message }),
    });

    if (!sendRes.ok) {
      const details = await sendRes.text();
      console.error(`Twilio send failed [${sendRes.status}]: ${details}`);
      return json({ error: "Could not send the confirmation text", status: sendRes.status, details }, sendRes.status);
    }

    const sent = await sendRes.json();
    return json({ sent: true, sid: sent?.sid, reference: record.reference_number });
  } catch (e) {
    console.error("send-inspection-sms error:", e);
    return json({ error: e instanceof Error ? e.message : "Unexpected error" }, 500);
  }
});
