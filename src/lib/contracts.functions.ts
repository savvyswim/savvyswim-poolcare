import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const sendContractEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        contractId: z.string().uuid(),
        origin: z.string().url().max(200),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    const { data: isOffice, error: roleError } = await supabase.rpc("ss_is_office");
    if (roleError || !isOffice) {
      throw new Error("Only office staff can send contracts");
    }

    const { data: contract, error } = await supabase
      .from("ss_contracts")
      .select("id, title, token, status, recipient_name, recipient_email")
      .eq("id", data.contractId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!contract) throw new Error("Contract not found");
    if (!contract.recipient_email) throw new Error("This contract has no recipient email");
    if (contract.status === "signed") throw new Error("This contract is already signed");
    if (contract.status === "voided") throw new Error("This contract was voided");

    const signUrl = `${new URL(data.origin).origin}/sign/${contract.token}`;
    const firstName = (contract.recipient_name ?? "there").split(" ")[0];

    const html = `
<div style="background:#F4EFE3;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;color:#2b2320;">
  <div style="max-width:560px;margin:0 auto;background:#fffdf8;border:1px solid #e5dcc9;border-radius:12px;overflow:hidden;">
    <div style="background:#8E1F2C;color:#F4EFE3;padding:20px 28px;">
      <div style="font-size:20px;font-weight:800;letter-spacing:.08em;">SAVVY SWIM</div>
      <div style="font-size:11px;letter-spacing:.14em;opacity:.85;margin-top:2px;">POOL SERVICE AGREEMENT</div>
    </div>
    <div style="padding:28px;">
      <p style="margin:0 0 12px;font-size:15px;">Hi ${firstName},</p>
      <p style="margin:0 0 16px;font-size:14px;line-height:1.6;">
        Your service agreement <strong>“${contract.title}”</strong> is ready for your signature.
        It takes less than a minute — review the terms and sign right from your phone.
      </p>
      <div style="text-align:center;margin:24px 0;">
        <a href="${signUrl}" style="background:#8E1F2C;color:#F4EFE3;text-decoration:none;padding:14px 32px;border-radius:999px;font-size:14px;font-weight:700;display:inline-block;">
          Review &amp; sign
        </a>
      </div>
      <p style="margin:0;font-size:12px;color:#7a6f63;line-height:1.6;">
        This link is unique to you. Questions? Call or text us at (469) 744-0379.
      </p>
    </div>
    <div style="border-top:1px solid #e5dcc9;padding:14px 28px;font-size:11px;color:#9a8f82;">
      Savvy Swim · Dallas–Fort Worth · savvyswim.com
    </div>
  </div>
</div>`;

    const text = `Hi ${firstName},

Your Savvy Swim service agreement "${contract.title}" is ready for your signature.

Review and sign here: ${signUrl}

Questions? Call or text (469) 744-0379.
Savvy Swim · savvyswim.com`;

    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("Email sending is not configured");

    const { sendLovableEmail } = await import("@lovable.dev/email-js");
    await sendLovableEmail(
      {
        to: contract.recipient_email,
        from: "Savvy Swim <noreply@notify.savvyswim.com>",
        sender_domain: "notify.savvyswim.com",
        subject: "Your Savvy Swim service agreement is ready to sign",
        html,
        text,
        label: "contract-esign",
        idempotency_key: `contract-send-${contract.id}-${Date.now()}`,
      },
      { apiKey },
    );

    const { error: updateError } = await supabase
      .from("ss_contracts")
      .update({ status: "sent", sent_at: new Date().toISOString() })
      .eq("id", contract.id);
    if (updateError) throw new Error(updateError.message);

    await supabase.from("ss_contract_events").insert({
      contract_id: contract.id,
      event: "sent",
      detail: `Emailed to ${contract.recipient_email}`,
    });

    return { sent: true, signUrl };
  });

export const sendContractSms = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        contractId: z.string().uuid(),
        phone: z.string().min(7).max(24),
        origin: z.string().url().max(200),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: isOffice, error: roleError } = await supabase.rpc("ss_is_office");
    if (roleError || !isOffice) throw new Error("Only office staff can send contracts");

    const { normalizePhone } = await import("./phone");
    const to = normalizePhone(data.phone);
    if (!to) throw new Error("Enter a valid phone number");

    const { data: contract, error } = await supabase
      .from("ss_contracts")
      .select("id, title, token, status, recipient_name")
      .eq("id", data.contractId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!contract) throw new Error("Contract not found");
    if (contract.status === "signed") throw new Error("This contract is already signed");
    if (contract.status === "voided") throw new Error("This contract was voided");

    const apiKey = process.env["LOVABLE_API_KEY"];
    const twilioKey = process.env["TWILIO_API_KEY"];
    if (!apiKey || !twilioKey) throw new Error("SMS sending is not configured");

    const origin = new URL(data.origin).origin;
    const signUrl = `${origin}/sign/${contract.token}`;
    const firstName = (contract.recipient_name ?? "there").split(" ")[0];
    const body = `Hi ${firstName}, your Savvy Swim service agreement is ready to sign: ${signUrl}\n\nQuestions? Call or text (469) 744-0379.`;

    const { data: logRow, error: logError } = await supabase
      .from("ss_contract_sms")
      .insert({ contract_id: contract.id, to_phone: to, status: "queued", sent_by: userId })
      .select("id")
      .single();
    if (logError) throw new Error(logError.message);

    const gwHeaders = {
      Authorization: `Bearer ${apiKey}`,
      "X-Connection-Api-Key": twilioKey,
    };
    const GATEWAY_URL = "https://connector-gateway.lovable.dev/twilio";

    const fail = async (message: string) => {
      await supabase
        .from("ss_contract_sms")
        .update({ status: "failed", error_message: message.slice(0, 500) })
        .eq("id", logRow.id);
      throw new Error(message);
    };

    const numbersRes = await fetch(`${GATEWAY_URL}/IncomingPhoneNumbers.json?PageSize=1`, { headers: gwHeaders });
    if (!numbersRes.ok) {
      const details = await numbersRes.text();
      console.error(`Twilio numbers lookup failed [${numbersRes.status}]: ${details}`);
      await fail(`Could not reach Twilio [${numbersRes.status}]`);
    }
    const numbers = (await numbersRes.json()) as { incoming_phone_numbers?: { phone_number?: string }[] };
    const from = numbers.incoming_phone_numbers?.[0]?.phone_number;
    if (!from) await fail("No Twilio phone number is available on the connected account");

    const params = new URLSearchParams({ To: to, From: from!, Body: body });
    const statusSecret = process.env["TWILIO_STATUS_WEBHOOK_SECRET"];
    if (origin.startsWith("https://") && statusSecret) {
      params.set(
        "StatusCallback",
        `${origin}/api/public/twilio/contract-sms-status?k=${encodeURIComponent(statusSecret)}`,
      );
    }

    const sendRes = await fetch(`${GATEWAY_URL}/Messages.json`, {
      method: "POST",
      headers: { ...gwHeaders, "Content-Type": "application/x-www-form-urlencoded" },
      body: params,
    });
    if (!sendRes.ok) {
      const details = await sendRes.text();
      console.error(`Twilio send failed [${sendRes.status}]: ${details}`);
      await fail(`Twilio rejected the message [${sendRes.status}]: ${details.slice(0, 200)}`);
    }
    const sent = (await sendRes.json()) as { sid?: string; status?: string };

    await supabase
      .from("ss_contract_sms")
      .update({ message_sid: sent.sid ?? null, status: sent.status ?? "sent" })
      .eq("id", logRow.id);

    if (contract.status === "draft") {
      await supabase
        .from("ss_contracts")
        .update({ status: "sent", sent_at: new Date().toISOString() })
        .eq("id", contract.id);
    }

    await supabase.from("ss_contract_events").insert({
      contract_id: contract.id,
      event: "sent",
      detail: `Texted to ${to}`,
    });

    return { sent: true, to, signUrl, sid: sent.sid ?? null };
  });
