/**
 * First-party site analytics intake: POST /api/public/events
 *
 * Accepts small anonymous batches (consent banner interactions and CTA clicks).
 * No identifiers are stored, page, event, button, consent state and UTM only.
 */
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const MAX_BODY_BYTES = 8 * 1024;

const eventSchema = z
  .object({
    event: z.enum([
      "page_view",
      "banner_shown",
      "banner_accepted",
      "banner_declined",
      "banner_reopened",
      "lead_click",
      "swim_club_click",
      "call_click",
      "maps_auth_blocked",
      "maps_fallback_shown",
    ]),
    page: z.string().trim().max(200),
    button: z.string().trim().max(80).optional().nullable(),
    consent: z.enum(["accepted", "declined", "unset"]),
    utm_source: z.string().trim().max(120).optional().nullable(),
    utm_medium: z.string().trim().max(120).optional().nullable(),
    utm_campaign: z.string().trim().max(120).optional().nullable(),
  })
  .strip();

const bodySchema = z.object({ events: z.array(eventSchema).min(1).max(20) });

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...CORS },
  });

export const Route = createFileRoute("/api/public/events")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        const raw = await request.text();
        if (raw.length > MAX_BODY_BYTES) return json({ error: "Payload too large" }, 413);

        let payload: unknown;
        try {
          payload = JSON.parse(raw);
        } catch {
          return json({ error: "Invalid JSON body" }, 400);
        }

        const parsed = bodySchema.safeParse(payload);
        if (!parsed.success) return json({ error: "Validation failed" }, 422);

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { error } = await supabaseAdmin.from("ss_site_events").insert(
          parsed.data.events.map((e) => ({
            event: e.event,
            page: e.page,
            button: e.button ?? null,
            consent_state: e.consent,
            utm_source: e.utm_source ?? null,
            utm_medium: e.utm_medium ?? null,
            utm_campaign: e.utm_campaign ?? null,
          })),
        );
        if (error) {
          console.error("site event insert failed", error.message);
          return json({ ok: false }, 500);
        }
        return json({ ok: true, count: parsed.data.events.length }, 202);
      },
    },
  },
});
