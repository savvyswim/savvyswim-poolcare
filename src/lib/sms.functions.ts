import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/twilio";

/**
 * Two-way SMS: outbound leg.
 *
 * Office staff can text any thread; a technician can only text a thread that is
 * assigned to them (RLS enforces the same rule at the row level).
 */
export const sendThreadSms = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        threadId: z.string().uuid(),
        body: z.string().trim().min(1, "Write a message").max(1200),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: thread, error } = await supabase
      .from("ss_sms_threads")
      .select("id, phone, assigned_staff_id")
      .eq("id", data.threadId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!thread) throw new Error("Conversation not found");

    const apiKey = process.env["LOVABLE_API_KEY"];
    const twilioKey = process.env["TWILIO_API_KEY"];
    if (!apiKey || !twilioKey) throw new Error("Texting is not configured");

    const { isSmsAllowed } = await import("./sms-compliance.server");
    if (!(await isSmsAllowed(thread.phone)))
      throw new Error("This number replied STOP — texting them is blocked until they reply START");

    const { data: logRow, error: logError } = await supabase
      .from("ss_sms_messages")
      .insert({
        thread_id: thread.id,
        direction: "out",
        body: data.body,
        to_number: thread.phone,
        status: "queued",
        sent_by: userId,
      })
      .select("id")
      .single();
    if (logError) throw new Error(logError.message);

    const headers = { Authorization: `Bearer ${apiKey}`, "X-Connection-Api-Key": twilioKey };

    const fail = async (message: string) => {
      await supabase
        .from("ss_sms_messages")
        .update({ status: "failed", error_detail: message.slice(0, 400) })
        .eq("id", logRow.id);
      throw new Error(message);
    };

    const numbersRes = await fetch(`${GATEWAY_URL}/IncomingPhoneNumbers.json?PageSize=1`, { headers });
    if (!numbersRes.ok) {
      const details = await numbersRes.text();
      console.error(`Twilio numbers lookup failed [${numbersRes.status}]: ${details}`);
      await fail(`Could not reach Twilio [${numbersRes.status}]`);
    }
    const numbers = (await numbersRes.json()) as { incoming_phone_numbers?: { phone_number?: string }[] };
    const from = numbers.incoming_phone_numbers?.[0]?.phone_number;
    if (!from) await fail("No Twilio phone number is available on the connected account");

    const sendRes = await fetch(`${GATEWAY_URL}/Messages.json`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ To: thread.phone, From: from!, Body: data.body }),
    });
    if (!sendRes.ok) {
      const details = await sendRes.text();
      console.error(`Twilio send failed [${sendRes.status}]: ${details}`);
      await fail(`Twilio rejected the message [${sendRes.status}]`);
    }
    const sent = (await sendRes.json()) as { sid?: string; status?: string };

    await supabase
      .from("ss_sms_messages")
      .update({ status: sent.status ?? "sent", twilio_sid: sent.sid ?? null, from_number: from ?? null })
      .eq("id", logRow.id);

    await supabase
      .from("ss_sms_threads")
      .update({
        last_message_at: new Date().toISOString(),
        last_preview: data.body.slice(0, 140),
        status: "open",
      })
      .eq("id", thread.id);

    return { ok: true as const };
  });

/**
 * Starts (or reuses) a conversation for a phone number and optionally links it
 * to a customer + the tech who runs that customer's route.
 */
export const startThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        phone: z.string().trim().min(7).max(30),
        customerId: z.string().uuid().optional(),
        displayName: z.string().trim().max(120).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { normalizePhone } = await import("./phone");
    const phone = normalizePhone(data.phone);
    if (!phone) throw new Error("Enter a valid phone number");

    const { data: existing } = await supabase
      .from("ss_sms_threads")
      .select("id")
      .eq("phone", phone)
      .maybeSingle();
    if (existing) return { id: existing.id };

    let assigned: string | null = null;
    let name = data.displayName ?? null;
    if (data.customerId) {
      const { data: cust } = await supabase
        .from("ss_customers")
        .select("full_name, assigned_tech_id")
        .eq("id", data.customerId)
        .maybeSingle();
      assigned = cust?.assigned_tech_id ?? null;
      name = name ?? cust?.full_name ?? null;
    }

    const { data: created, error } = await supabase
      .from("ss_sms_threads")
      .insert({
        phone,
        customer_id: data.customerId ?? null,
        display_name: name,
        assigned_staff_id: assigned,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: created.id };
  });

/** Emails/texts a quote link to the recipient and marks the quote as sent. */
export const sendQuoteSms = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ quoteId: z.string().uuid(), origin: z.string().url() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: isOffice } = await supabase.rpc("ss_is_office");
    if (!isOffice) throw new Error("Only office staff can send quotes");

    const { data: quote, error } = await supabase
      .from("ss_quotes")
      .select("id, token, recipient_name, recipient_phone, status")
      .eq("id", data.quoteId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!quote) throw new Error("Quote not found");

    const { normalizePhone } = await import("./phone");
    const to = normalizePhone(quote.recipient_phone ?? "");
    if (!to) throw new Error("Add a mobile number to the quote first");

    const apiKey = process.env["LOVABLE_API_KEY"];
    const twilioKey = process.env["TWILIO_API_KEY"];
    if (!apiKey || !twilioKey) throw new Error("Texting is not configured");

    const origin = new URL(data.origin).origin;
    const link = `${origin}/quote/${quote.token}`;
    const firstName = (quote.recipient_name ?? "there").split(" ")[0];
    const { isSmsAllowed, withSmsFooter } = await import("./sms-compliance.server");
    if (!(await isSmsAllowed(to)))
      throw new Error("This number replied STOP — texting them is blocked until they reply START");
    const body = withSmsFooter(
      `Hi ${firstName}, your Savvy Swim proposal is ready — photos, pricing and optional add-ons: ${link}`,
    );

    const headers = { Authorization: `Bearer ${apiKey}`, "X-Connection-Api-Key": twilioKey };
    const numbersRes = await fetch(`${GATEWAY_URL}/IncomingPhoneNumbers.json?PageSize=1`, { headers });
    if (!numbersRes.ok) throw new Error(`Could not reach Twilio [${numbersRes.status}]`);
    const numbers = (await numbersRes.json()) as { incoming_phone_numbers?: { phone_number?: string }[] };
    const from = numbers.incoming_phone_numbers?.[0]?.phone_number;
    if (!from) throw new Error("No Twilio phone number is available");

    const sendRes = await fetch(`${GATEWAY_URL}/Messages.json`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ To: to, From: from, Body: body }),
    });
    if (!sendRes.ok) {
      const details = await sendRes.text();
      console.error(`Twilio quote send failed [${sendRes.status}]: ${details}`);
      throw new Error(`Twilio rejected the message [${sendRes.status}]`);
    }

    await supabase
      .from("ss_quotes")
      .update({ status: quote.status === "draft" ? "sent" : quote.status, sent_at: new Date().toISOString() })
      .eq("id", quote.id);

    return { ok: true as const, link };
  });
