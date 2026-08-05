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
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const TWILIO_API_KEY = Deno.env.get("TWILIO_API_KEY");
    if (!LOVABLE_API_KEY || !TWILIO_API_KEY) {
      return json({ error: "SMS is not configured" }, 500);
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);

    const { data: isStaff } = await supabase.rpc("ss_is_staff");
    if (!isStaff) return json({ error: "Forbidden" }, 403);

    const body = await req.json().catch(() => null);
    const phoneRaw = typeof body?.phone === "string" ? body.phone : "";
    const message = typeof body?.message === "string" ? body.message.trim() : "";
    const link = typeof body?.link === "string" ? body.link.trim() : "";

    const to = normalizePhone(phoneRaw);
    if (!to) return json({ error: "Enter a valid phone number" }, 400);
    if (!message || message.length > 1200) {
      return json({ error: "Message must be between 1 and 1200 characters" }, 400);
    }
    if (link && !/^https:\/\//.test(link)) {
      return json({ error: "Link must be an https URL" }, 400);
    }

    // Resolve a sender number from the connected Twilio account.
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
    if (!from) return json({ error: "No Twilio phone number is available on the connected account" }, 400);

    const fullBody = link ? `${message}\n\nView & edit: ${link}` : message;

    const sendRes = await fetch(`${GATEWAY_URL}/Messages.json`, {
      method: "POST",
      headers: { ...gwHeaders, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ To: to, From: from, Body: fullBody }),
    });
    if (!sendRes.ok) {
      const details = await sendRes.text();
      console.error(`Twilio send failed [${sendRes.status}]: ${details}`);
      return json({ error: "Twilio rejected the message", status: sendRes.status, details }, sendRes.status);
    }
    const sent = await sendRes.json();
    return json({ ok: true, sid: sent.sid, to, from });
  } catch (e) {
    console.error("send-quote-sms error", e);
    return json({ error: e instanceof Error ? e.message : "Unexpected error" }, 500);
  }
});
