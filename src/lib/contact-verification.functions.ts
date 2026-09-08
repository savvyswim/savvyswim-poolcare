import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const CODE_TTL_MINUTES = 15;
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_SECONDS = 45;
const GATEWAY_URL = "https://connector-gateway.lovable.dev/twilio";

const hashCode = async (channel: string, value: string, code: string) => {
  const data = new TextEncoder().encode(`${channel}:${value.toLowerCase()}:${code}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

const makeCode = () => {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return String(100000 + ((buf[0] ?? 0) % 900000));
};

const mask = (channel: "email" | "sms", value: string) => {
  if (channel === "email") {
    const [user = "", domain = ""] = value.split("@");
    const head = user.slice(0, 2);
    return `${head}${"•".repeat(Math.max(1, user.length - 2))}@${domain}`;
  }
  return `••• ••• ${value.slice(-4)}`;
};

async function sendSms(to: string, body: string) {
  const apiKey = process.env["LOVABLE_API_KEY"];
  const twilioKey = process.env["TWILIO_API_KEY"];
  if (!apiKey || !twilioKey) throw new Error("Texting is not configured, use email verification instead");
  const headers = { Authorization: `Bearer ${apiKey}`, "X-Connection-Api-Key": twilioKey };

  const numbersRes = await fetch(`${GATEWAY_URL}/IncomingPhoneNumbers.json?PageSize=1`, { headers });
  if (!numbersRes.ok) {
    const details = await numbersRes.text();
    console.error(`Twilio numbers lookup failed [${numbersRes.status}]: ${details}`);
    throw new Error(`Could not reach the texting service [${numbersRes.status}]`);
  }
  const numbers = (await numbersRes.json()) as { incoming_phone_numbers?: { phone_number?: string }[] };
  const from = numbers.incoming_phone_numbers?.[0]?.phone_number;
  if (!from) throw new Error("No outbound number is available right now");

  const sendRes = await fetch(`${GATEWAY_URL}/Messages.json`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ To: to, From: from, Body: body }),
  });
  if (!sendRes.ok) {
    const details = await sendRes.text();
    console.error(`Twilio send failed [${sendRes.status}]: ${details}`);
    throw new Error(`We could not text that number [${sendRes.status}]`);
  }
}

async function sendEmailCode(to: string, firstName: string, code: string) {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("Email is not configured right now");
  const html = `
<div style="background:#F4EFE3;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;color:#2b2320;">
  <div style="max-width:520px;margin:0 auto;background:#fffdf8;border:1px solid #e5dcc9;">
    <div style="background:#8E1F2C;color:#F4EFE3;padding:20px 28px;">
      <div style="font-size:20px;font-weight:800;letter-spacing:.08em;">SAVVY SWIM</div>
      <div style="font-size:11px;letter-spacing:.14em;opacity:.85;margin-top:2px;">CONFIRM YOUR EMAIL</div>
    </div>
    <div style="padding:28px;">
      <p style="margin:0 0 12px;font-size:15px;">Hi ${firstName},</p>
      <p style="margin:0 0 18px;font-size:14px;line-height:1.6;">
        Use this code to confirm this email address on your Savvy Swim account.
      </p>
      <div style="font-size:30px;letter-spacing:.32em;font-weight:800;color:#8E1F2C;">${code}</div>
      <p style="margin:18px 0 0;font-size:12px;color:#7a6f63;line-height:1.6;">
        The code expires in ${CODE_TTL_MINUTES} minutes. If you did not request this change, ignore this email
        and call us at (817) 663-7665.
      </p>
    </div>
  </div>
</div>`;
  const { sendLovableEmail } = await import("@lovable.dev/email-js");
  await sendLovableEmail(
    {
      to,
      from: "Savvy Swim <noreply@notify.savvyswimservices.com>",
      sender_domain: "notify.savvyswimservices.com",
      reply_to: "hi@savvyswim.com",
      subject: `${code} is your Savvy Swim confirmation code`,
      html,
      text: `Hi ${firstName}, your Savvy Swim confirmation code is ${code}. It expires in ${CODE_TTL_MINUTES} minutes.`,
      label: "portal-contact-verification",
      purpose: "transactional",
      idempotency_key: `contact-verify-${to}-${code}`,
    },
    { apiKey },
  );
}

/**
 * Step 1. Customer asks to change the email or phone on file. We send a
 * one-time code to the NEW address/number so a typo can never lock them out.
 */
export const requestContactChange = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        channel: z.enum(["email", "sms"]),
        value: z.string().trim().min(3).max(200),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: customerId, error: meError } = await supabase.rpc("ss_my_customer_id");
    if (meError) throw new Error(meError.message);
    if (!customerId) throw new Error("No customer account is linked to this login");

    const { data: customer } = await supabase
      .from("ss_customers")
      .select("full_name, email, phone")
      .eq("id", customerId)
      .maybeSingle();

    let value = data.value.trim();
    if (data.channel === "email") {
      value = value.toLowerCase();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value)) throw new Error("Enter a valid email address");
      if (value === (customer?.email ?? "").toLowerCase()) throw new Error("That is already your email on file");
    } else {
      const { normalizePhone } = await import("./phone");
      const normalized = normalizePhone(value);
      if (!normalized) throw new Error("Enter a valid mobile number");
      value = normalized;
      if (value === normalizePhone(customer?.phone ?? "")) throw new Error("That is already your number on file");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: recent } = await supabaseAdmin
      .from("ss_contact_verifications")
      .select("created_at")
      .eq("customer_id", customerId)
      .eq("channel", data.channel)
      .is("consumed_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (recent?.created_at) {
      const elapsed = (Date.now() - new Date(recent.created_at).getTime()) / 1000;
      if (elapsed < RESEND_COOLDOWN_SECONDS) {
        throw new Error(`Hang tight. You can request another code in ${Math.ceil(RESEND_COOLDOWN_SECONDS - elapsed)}s`);
      }
    }

    const code = makeCode();
    const firstName = (customer?.full_name ?? "there").split(" ")[0] ?? "there";

    if (data.channel === "email") {
      await sendEmailCode(value, firstName, code);
    } else {
      await sendSms(value, `Savvy Swim: ${code} is your confirmation code to use this number on your account. Expires in ${CODE_TTL_MINUTES} min.`);
    }

    // Only invalidate older pending codes once the new one actually went out.
    await supabaseAdmin
      .from("ss_contact_verifications")
      .update({ consumed_at: new Date().toISOString() })
      .eq("customer_id", customerId)
      .eq("channel", data.channel)
      .is("consumed_at", null);

    const { error: insertError } = await supabaseAdmin.from("ss_contact_verifications").insert({
      customer_id: customerId,
      user_id: userId,
      channel: data.channel,
      new_value: value,
      code_hash: await hashCode(data.channel, value, code),
      expires_at: new Date(Date.now() + CODE_TTL_MINUTES * 60_000).toISOString(),
    });
    if (insertError) throw new Error(insertError.message);

    return { sentTo: mask(data.channel, value), value, expiresInMinutes: CODE_TTL_MINUTES };
  });

/**
 * Step 2, confirm the code and write the verified value onto the customer record.
 */
export const confirmContactChange = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        channel: z.enum(["email", "sms"]),
        code: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code"),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    const { data: customerId, error: meError } = await supabase.rpc("ss_my_customer_id");
    if (meError) throw new Error(meError.message);
    if (!customerId) throw new Error("No customer account is linked to this login");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: pending, error } = await supabaseAdmin
      .from("ss_contact_verifications")
      .select("id, new_value, code_hash, attempts, expires_at")
      .eq("customer_id", customerId)
      .eq("channel", data.channel)
      .is("consumed_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!pending) throw new Error("Request a new code, this one is no longer active");

    if (new Date(pending.expires_at).getTime() < Date.now()) {
      await supabaseAdmin
        .from("ss_contact_verifications")
        .update({ consumed_at: new Date().toISOString() })
        .eq("id", pending.id);
      throw new Error("That code expired, request a new one");
    }

    if ((pending.attempts ?? 0) >= MAX_ATTEMPTS) {
      await supabaseAdmin
        .from("ss_contact_verifications")
        .update({ consumed_at: new Date().toISOString() })
        .eq("id", pending.id);
      throw new Error("Too many tries, request a new code");
    }

    const candidate = await hashCode(data.channel, pending.new_value, data.code);
    if (candidate !== pending.code_hash) {
      await supabaseAdmin
        .from("ss_contact_verifications")
        .update({ attempts: (pending.attempts ?? 0) + 1 })
        .eq("id", pending.id);
      throw new Error("That code does not match, check it and try again");
    }

    const patch = data.channel === "email" ? { email: pending.new_value } : { phone: pending.new_value };
    const { error: updateError } = await supabaseAdmin
      .from("ss_customers")
      .update(patch)
      .eq("id", customerId);
    if (updateError) throw new Error(updateError.message);

    await supabaseAdmin
      .from("ss_contact_verifications")
      .update({ consumed_at: new Date().toISOString() })
      .eq("id", pending.id);

    await supabaseAdmin.from("ss_feed").insert({
      customer_id: customerId,
      kind: "note",
      title: data.channel === "email" ? "Email address verified & updated" : "Phone number verified & updated",
      body: `Customer confirmed ${mask(data.channel, pending.new_value)} with a one-time code from /portal.`,
    });

    return { ok: true as const, value: pending.new_value };
  });
