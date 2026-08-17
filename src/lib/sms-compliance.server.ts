/**
 * Single source of truth for SMS consent (TCPA-style).
 *
 * Every outbound marketing/transactional text goes through `assertSmsAllowed`
 * and `withSmsFooter` so STOP/HELP language is identical everywhere, and every
 * inbound STOP/START/HELP keyword updates the same `ss_sms_consent` row.
 */
import { normalizePhone } from "./phone";

/** Wording appended to outbound texts so opt-out instructions are always present. */
export const SMS_FOOTER = "Reply STOP to opt out, HELP for help.";

/** Auto-reply sent when someone texts HELP. */
export const SMS_HELP_REPLY =
  "Savvy Swim pool service. Msg & data rates may apply. Msg frequency varies. Reply STOP to opt out. Help: (817) 663-7665 or hi@savvyswim.com";

/** Auto-reply confirming an opt-out. */
export const SMS_STOP_REPLY =
  "You're unsubscribed from Savvy Swim texts. No more messages will be sent. Reply START to opt back in.";

/** Auto-reply confirming an opt-in. */
export const SMS_START_REPLY = `You're subscribed to Savvy Swim service updates. Msg & data rates may apply. ${SMS_FOOTER}`;

export const STOP_KEYWORDS = ["stop", "stopall", "unsubscribe", "cancel", "end", "quit", "revoke"];
export const START_KEYWORDS = ["start", "unstop", "yes", "subscribe"];
export const HELP_KEYWORDS = ["help", "info"];

export function classifySmsKeyword(body: string): "stop" | "start" | "help" | null {
  const word = body.trim().toLowerCase().replace(/[^a-z]/g, "");
  if (!word) return null;
  if (STOP_KEYWORDS.includes(word)) return "stop";
  if (START_KEYWORDS.includes(word)) return "start";
  if (HELP_KEYWORDS.includes(word)) return "help";
  return null;
}

/** Appends the STOP/HELP footer unless the body already carries it. */
export function withSmsFooter(body: string) {
  return /reply stop/i.test(body) ? body : `${body.trim()}\n\n${SMS_FOOTER}`;
}

type ConsentInput = {
  phone: string;
  optedIn: boolean;
  consentText?: string | null;
  source?: string | null;
  url?: string | null;
};

/** Writes (or updates) the consent record for a phone number. */
export async function recordSmsConsent(input: ConsentInput) {
  const phone = normalizePhone(input.phone);
  if (!phone) return null;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const now = new Date().toISOString();

  const { error } = await supabaseAdmin.from("ss_sms_consent").upsert(
    {
      phone,
      opted_in: input.optedIn,
      consent_text: input.consentText ?? null,
      consent_source: input.source ?? null,
      consent_url: input.url ?? null,
      consented_at: input.optedIn ? now : null,
      revoked_at: input.optedIn ? null : now,
      updated_at: now,
    },
    { onConflict: "phone" },
  );
  if (error) console.error(`sms consent write failed: ${error.message}`);
  return phone;
}

/** Records that we answered a HELP request. */
export async function recordHelpRequest(phone: string) {
  const normalized = normalizePhone(phone);
  if (!normalized) return;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const now = new Date().toISOString();
  const { error } = await supabaseAdmin
    .from("ss_sms_consent")
    .upsert(
      { phone: normalized, last_help_at: now, updated_at: now },
      { onConflict: "phone", ignoreDuplicates: false },
    );
  if (error) console.error(`sms help log failed: ${error.message}`);
}

/** True when this number has not opted out. */
export async function isSmsAllowed(phone: string) {
  const normalized = normalizePhone(phone);
  if (!normalized) return false;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("ss_sms_consent")
    .select("opted_in, revoked_at")
    .eq("phone", normalized)
    .maybeSingle();
  if (!data) return true; // no record = never opted out (staff-initiated conversation)
  return data.opted_in && !data.revoked_at;
}

/** True only when this number gave an explicit opt-in (required for automated updates). */
export async function hasSmsOptIn(phone: string) {
  const normalized = normalizePhone(phone);
  if (!normalized) return false;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("ss_sms_consent")
    .select("opted_in, revoked_at")
    .eq("phone", normalized)
    .maybeSingle();
  if (data) return Boolean(data.opted_in && !data.revoked_at);

  // No consent row yet: honor a pre-existing opt-in captured on the older
  // booking / inspection forms, and migrate it into the consent ledger so the
  // audit trail is complete. Never opts anyone in who did not check the box.
  return hasLegacySmsOptIn(normalized);
}

/** Looks for an explicit opt-in recorded on the legacy booking/inspection forms. */
async function hasLegacySmsOptIn(normalized: string): Promise<boolean> {
  const digits = normalized.replace(/^\+1/, "");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const [bookings, inspections] = await Promise.all([
    supabaseAdmin
      .from("bookings")
      .select("created_at")
      .eq("sms_opt_in", true)
      .ilike("phone", `%${digits}%`)
      .limit(1),
    supabaseAdmin
      .from("inspection_requests")
      .select("created_at")
      .eq("sms_opt_in", true)
      .ilike("phone", `%${digits}%`)
      .limit(1),
  ]);

  const source = bookings.data?.[0]
    ? "legacy_booking"
    : inspections.data?.[0]
      ? "legacy_inspection_request"
      : null;
  if (!source) return false;

  const consentedAt =
    bookings.data?.[0]?.created_at ?? inspections.data?.[0]?.created_at ?? new Date().toISOString();

  await recordSmsConsent({
    phone: normalized,
    optedIn: true,
    source,
    consentText: "Legacy opt-in migrated from prior booking/inspection form SMS checkbox",
  });
  // recordSmsConsent stamps consented_at with now(); keep the original date.
  await supabaseAdmin
    .from("ss_sms_consent")
    .update({ consented_at: consentedAt })
    .eq("phone", normalized);

  return true;
}

