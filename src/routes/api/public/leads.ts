/**
 * Public lead intake: POST /api/public/leads
 *
 * External callers (landing pages, ad forms, the CRM) drop leads here.
 * Everything is validated with Zod and rate limited per IP + per email so a
 * malformed or looping client can't flood inspection_requests.
 */
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { extractZip } from "@/lib/postal";

const MAX_BODY_BYTES = 8 * 1024;

const leadSchema = z
  .object({
    full_name: z.string().trim().min(2).max(120),
    email: z.string().trim().email().max(255),
    phone: z.string().trim().min(7).max(20).optional().nullable(),
    address: z.string().trim().max(255).optional().nullable(),
    postal_code: z.string().trim().max(12).optional().nullable(),
    city: z.string().trim().max(80).optional().nullable(),
    preferred_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional()
      .nullable(),
    preferred_contact_time: z.string().trim().max(60).optional().nullable(),
    pool_details: z.string().trim().max(1000).optional().nullable(),
    message: z.string().trim().max(2000).optional().nullable(),
    notes: z.string().trim().max(2000).optional().nullable(),
    // Optional discount / referral code typed by the visitor (kept in the notes).
    promo_code: z.string().trim().max(40).optional().nullable(),
    sms_opt_in: z.boolean().optional().nullable(),
    contact_consent: z.boolean().optional().nullable(),
    // Exact authorization wording the visitor saw, stored with the consent record.
    consent_text: z.string().trim().max(2000).optional().nullable(),
    // Version stamp of the wording shown, part of the proof of consent record.
    consent_version: z.string().trim().max(40).optional().nullable(),

    source: z.string().trim().max(80).optional().nullable(),
    page: z.string().trim().max(255).optional().nullable(),
    campaign_id: z.string().trim().max(60).optional().nullable(),
    campaign_code: z.string().trim().max(40).optional().nullable(),
    gclid: z.string().trim().max(200).optional().nullable(),
    fbclid: z.string().trim().max(200).optional().nullable(),
    utm_source: z.string().trim().max(120).optional().nullable(),
    utm_medium: z.string().trim().max(120).optional().nullable(),
    utm_campaign: z.string().trim().max(120).optional().nullable(),
    utm_term: z.string().trim().max(120).optional().nullable(),
    utm_content: z.string().trim().max(120).optional().nullable(),
    referrer: z.string().trim().max(255).optional().nullable(),
    landing_page: z.string().trim().max(255).optional().nullable(),
    session_id: z.string().trim().max(64).optional().nullable(),

    // Milliseconds between the form rendering and submit, bots fill instantly.
    elapsed_ms: z.number().int().min(0).max(86_400_000).optional().nullable(),
    // Cloudflare Turnstile token, when the embed is configured with a site key.
    turnstile_token: z.string().max(4000).optional().nullable(),
    // Honeypot: real people never fill this in.
    company: z.string().max(0).optional().nullable(),
  })
  .strip();

/** Anything faster than this is a script, not a person filling in a form. */
const MIN_FILL_MS = 2500;

/** Verify a Turnstile token. Returns true when Turnstile isn't configured. */
async function turnstileOk(token: string | null | undefined, ip: string): Promise<boolean> {
  const secret = process.env['TURNSTILE_SECRET_KEY'];
  if (!secret) return true; // not configured, other checks still apply
  if (!token) return false;
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret, response: token, remoteip: ip }),
    });
    if (!res.ok) {
      console.error("turnstile verify failed", res.status, await res.text());
      return true; // fail open rather than dropping real leads on an outage
    }
    const body = (await res.json()) as { success?: boolean };
    return body.success === true;
  } catch (err) {
    console.error("turnstile verify error", err);
    return true;
  }
}


const json = (body: unknown, status = 200, extra?: Record<string, string>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "content-type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      ...extra,
    },
  });

function clientIp(request: Request): string {
  const fwd = request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0] ||
    "unknown";
  return fwd.trim().slice(0, 64);
}

export const Route = createFileRoute("/api/public/leads")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "content-type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      } }),
      POST: async ({ request }) => {
        const raw = await request.text();
        if (raw.length > MAX_BODY_BYTES) {
          return json({ error: "Payload too large" }, 413);
        }

        let payload: unknown;
        try {
          payload = JSON.parse(raw);
        } catch {
          return json({ error: "Invalid JSON body" }, 400);
        }

        const parsed = leadSchema.safeParse(payload);
        if (!parsed.success) {
          return json(
            {
              error: "Validation failed",
              issues: parsed.error.issues.map((i) => ({
                field: i.path.join("."),
                message: i.message,
              })),
            },
            422,
          );
        }
        const lead = parsed.data;
        const ip = clientIp(request);

        /** Log spam we turned away, then answer 200 so bots learn nothing. */
        const rejectQuietly = async (reason: string) => {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          await supabaseAdmin
            .from("ss_site_events")
            .insert({
              event: "lead_blocked",
              page: lead.page ?? "/api/public/leads",
              button: reason,
              consent_state: "unset",
              utm_source: lead.utm_source ?? lead.source ?? null,
            })
            .then(undefined, () => undefined);
          return json({ ok: true, deduped: true });
        };

        // Honeypot hit.
        if (lead.company) return rejectQuietly("honeypot");

        // Filled in faster than a human can type.
        if (typeof lead.elapsed_ms === "number" && lead.elapsed_ms < MIN_FILL_MS) {
          return rejectQuietly("too_fast");
        }

        if (!(await turnstileOk(lead.turnstile_token, ip))) {
          return rejectQuietly("turnstile");
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");


        // Forms where email is optional send a "no-email.<digits>@" marker, so
        // flood protection and de-duplication key off the phone number instead.
        const emailless = lead.email.toLowerCase().startsWith("no-email.");
        const phoneDigits = (lead.phone ?? "").replace(/\D/g, "").slice(-10);
        const limitKey = emailless && phoneDigits ? phoneDigits : lead.email.toLowerCase();

        const limits: Array<[string, string, number, number]> = [
          ["leads_ip", ip, 3600, 10],
          [emailless ? "leads_phone" : "leads_email", limitKey, 3600, 3],
        ];
        for (const [bucket, identifier, windowSeconds, maxHits] of limits) {
          const { data: allowed, error } = await supabaseAdmin.rpc("ss_rate_limit_hit", {
            _bucket: bucket,
            _identifier: identifier,
            _window_seconds: windowSeconds,
            _max_hits: maxHits,
          });
          if (error) {
            console.error("rate limit check failed", error.message);
            break; // fail open rather than dropping a real lead
          }
          if (allowed === false) {
            return json({ error: "Too many requests. Please try again later." }, 429, {
              "Retry-After": "3600",
            });
          }
        }

        // Collapse duplicate submissions inside a 10 minute window.
        const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
        const dupeQuery = supabaseAdmin
          .from("inspection_requests")
          .select("id, reference_number")
          .gte("created_at", since);
        const { data: dupe } = await (
          emailless && phoneDigits
            ? dupeQuery.eq("phone", lead.phone as string)
            : dupeQuery.eq("email", lead.email)
        ).maybeSingle();
        if (dupe) {
          return json({ ok: true, deduped: true, id: dupe.id, reference: dupe.reference_number });
        }

        // Consent lives in its own columns (contact_consent / consent_text), // notes stay clean and hold only what the customer typed.
        const notes = [lead.notes, lead.message].filter(Boolean).join("\n\n") || null;

        // Proof of consent: the exact wording plus when, where and from which
        // device and address it was accepted. Kept with the consent record.
        const consentRecord = lead.consent_text
          ? [
              lead.consent_version ? `[consent ${lead.consent_version}]` : "",
              lead.consent_text,
              `Accepted ${new Date().toISOString()} on ${lead.page ?? "/"} from IP ${ip}, device ${(request.headers.get("user-agent") ?? "unknown").slice(0, 200)}`,
            ]
              .filter(Boolean)
              .join(" ")
              .slice(0, 4000)
          : null;

        // Validate the optional discount / referral code. An unknown code is
        // stored and flagged rather than rejected. Never lose a lead over it.
        const { lookupPromoCode } = await import("@/lib/promo.functions");
        const promo = await lookupPromoCode(lead.promo_code ?? "");



        const { leadTypeFromSource } = await import("@/lib/crm-lead-forward.server");
        const leadType = leadTypeFromSource(lead.source);

        const { data, error } = await supabaseAdmin
          .from("inspection_requests")
          .insert({
            full_name: lead.full_name,
            email: lead.email,
            phone: lead.phone ?? "",
            address: lead.address ?? lead.city ?? "",
            postal_code: lead.postal_code || extractZip(lead.address ?? ""),
            preferred_date: lead.preferred_date ?? null,
            preferred_contact_time: lead.preferred_contact_time ?? null,
            pool_details: lead.pool_details ?? null,
            notes,
            campaign_id: lead.campaign_id ?? lead.campaign_code ?? null,
            utm_source: lead.utm_source ?? lead.source ?? null,
            utm_medium: lead.utm_medium ?? null,
            utm_campaign: lead.utm_campaign ?? null,
            utm_term: lead.utm_term ?? null,
            utm_content: lead.utm_content ?? lead.gclid ?? lead.fbclid ?? null,
            referrer: lead.referrer ?? null,
            landing_page: lead.landing_page ?? null,
            session_id: lead.session_id ?? null,
            page_path: lead.page ?? null,
            sms_opt_in: lead.sms_opt_in === true,
            contact_consent: lead.contact_consent === true,
            consent_text: consentRecord,
            source: lead.source ?? null,
            lead_type: leadType,
            promo_code: promo.code,
            promo_status: promo.status === "empty" ? null : promo.status,
            promo_detail:
              promo.status === "valid"
                ? [promo.kind === "referral" ? "Referral" : "Promo", promo.detail]
                    .filter(Boolean)
                    .join(": ")
                : (promo.message ?? null),


          })
          .select("id, reference_number")
          .single();

        if (lead.phone) {
          const { recordSmsConsent } = await import("@/lib/sms-compliance.server");
          await recordSmsConsent({
            phone: lead.phone,
            optedIn: lead.sms_opt_in === true,
            consentText:
              lead.consent_text ||
              (lead.sms_opt_in === true
                ? "Web form: authorized calls, texts and email about this request. Msg & data rates may apply. Reply STOP to opt out, HELP for help."
                : "Web form: authorization checkbox left unchecked"),
            source: lead.source ?? "website_lead_form",
            url: lead.page ?? null,
          });
        }

        if (error || !data) {
          console.error("public lead insert failed", error?.message);
          return json({ error: "Could not save lead" }, 500);
        }

        // Backup: hand every lead off to the CRM app. Never block the visitor on it, // failures are logged to ss_webhook_deliveries and retryable there.
        try {
          const { forwardInspectionToCrm } = await import("@/lib/crm-lead-forward.server");
          await forwardInspectionToCrm(data.id, {
            leadType,
            smsOptIn: lead.sms_opt_in === true,
            contactConsent: lead.contact_consent === true,
          });

        } catch (err) {
          console.error("CRM lead forward threw", err);
        }

        // Confirmation to the homeowner + new-request alert to the office.
        // Also never blocks the visitor; failures are logged to inspection_events.
        try {
          const { sendInspectionNotifications } = await import("@/lib/inspection-notify.server");
          await sendInspectionNotifications(data.id);
        } catch (err) {
          console.error("inspection notification threw", err);
        }



        return json({ ok: true, id: data.id, reference: data.reference_number }, 201);
      },
    },
  },
});
