/**
 * Public lead intake: POST /api/public/leads
 *
 * External callers (landing pages, ad forms, the CRM) drop leads here.
 * Everything is validated with Zod and rate limited per IP + per email so a
 * malformed or looping client can't flood inspection_requests.
 */
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

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
    sms_opt_in: z.boolean().optional().nullable(),
    contact_consent: z.boolean().optional().nullable(),
    // Exact authorization wording the visitor saw, stored with the consent record.
    consent_text: z.string().trim().max(1000).optional().nullable(),

    source: z.string().trim().max(80).optional().nullable(),
    page: z.string().trim().max(255).optional().nullable(),
    utm_source: z.string().trim().max(120).optional().nullable(),
    utm_medium: z.string().trim().max(120).optional().nullable(),
    utm_campaign: z.string().trim().max(120).optional().nullable(),
    // Milliseconds between the form rendering and submit — bots fill instantly.
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
  if (!secret) return true; // not configured — other checks still apply
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


        const limits: Array<[string, string, number, number]> = [
          ["leads_ip", ip, 3600, 10],
          ["leads_email", lead.email.toLowerCase(), 3600, 3],
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
        const { data: dupe } = await supabaseAdmin
          .from("inspection_requests")
          .select("id, reference_number")
          .eq("email", lead.email)
          .gte("created_at", since)
          .maybeSingle();
        if (dupe) {
          return json({ ok: true, deduped: true, id: dupe.id, reference: dupe.reference_number });
        }

        const notes =
          [
            lead.notes,
            lead.message,
            lead.contact_consent ? "Consent to contact (call/text/email): yes" : null,
            lead.sms_opt_in ? "SMS opt-in: yes" : null,
          ]
            .filter(Boolean)
            .join("\n\n") || null;


        const { data, error } = await supabaseAdmin
          .from("inspection_requests")
          .insert({
            full_name: lead.full_name,
            email: lead.email,
            phone: lead.phone ?? "",
            address: lead.address ?? lead.city ?? "",
            postal_code: lead.postal_code ?? "",
            preferred_date: lead.preferred_date ?? null,
            preferred_contact_time: lead.preferred_contact_time ?? null,
            pool_details: lead.pool_details ?? null,
            notes,
            utm_source: lead.utm_source ?? lead.source ?? null,
            utm_medium: lead.utm_medium ?? null,
            utm_campaign: lead.utm_campaign ?? null,
            page_path: lead.page ?? null,
            sms_opt_in: lead.sms_opt_in === true,
          })
          .select("id, reference_number")
          .single();

        if (lead.phone) {
          const { recordSmsConsent } = await import("@/lib/sms-compliance.server");
          await recordSmsConsent({
            phone: lead.phone,
            optedIn: lead.sms_opt_in === true,
            consentText:
              lead.sms_opt_in === true
                ? "Web form: opted in to SMS updates about my appointment. Msg & data rates may apply. Reply STOP to opt out, HELP for help."
                : "Web form: SMS opt-in checkbox left unchecked",
            source: lead.source ?? "website_lead_form",
            url: lead.page ?? null,
          });
        }

        if (error || !data) {
          console.error("public lead insert failed", error?.message);
          return json({ error: "Could not save lead" }, 500);
        }

        // Hand every lead off to the CRM. Never block the visitor on it —
        // failures are logged to ss_webhook_deliveries and retryable there.
        try {
          const { forwardInspectionToCrm, leadTypeFromSource } = await import(
            "@/lib/crm-lead-forward.server"
          );
          await forwardInspectionToCrm(data.id, {
            leadType: leadTypeFromSource(lead.source),
            smsOptIn: lead.sms_opt_in === true,
            contactConsent: lead.contact_consent === true,
          });
        } catch (err) {
          console.error("CRM lead forward threw", err);
        }

        return json({ ok: true, id: data.id, reference: data.reference_number }, 201);
      },
    },
  },
});
