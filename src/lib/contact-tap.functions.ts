import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Click-to-call and click-to-text taps are saved from the browser, then this
 * function hands the same tap to the SavvySwim app so the app shows someone
 * reached out even when they never filled in a form.
 *
 * Public on purpose (a visitor is not signed in), so it is rate limited per
 * address and carries no free text from the caller beyond short labels.
 */
const TapSchema = z.object({
  id: z.string().uuid(),
  event_type: z.enum(["call_click", "text_click"]),
  placement: z.string().trim().max(80).optional().nullable(),
  page_path: z.string().trim().max(200).optional().nullable(),
  session_id: z.string().trim().max(80).optional().nullable(),
  campaign_id: z.string().trim().max(80).optional().nullable(),
  utm_source: z.string().trim().max(120).optional().nullable(),
  utm_medium: z.string().trim().max(120).optional().nullable(),
  utm_campaign: z.string().trim().max(120).optional().nullable(),
  utm_term: z.string().trim().max(120).optional().nullable(),
  utm_content: z.string().trim().max(120).optional().nullable(),
  referrer: z.string().trim().max(255).optional().nullable(),
  landing_page: z.string().trim().max(255).optional().nullable(),
});

export const reportContactTap = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => TapSchema.parse(input))
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    try {
      const { getRequest } = await import("@tanstack/react-start/server");
      const headers = getRequest().headers;
      const ip =
        headers.get("cf-connecting-ip") ||
        headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        "unknown";

      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: allowed } = await (
        supabaseAdmin as unknown as {
          rpc: (fn: "ss_rate_limit_hit", args: Record<string, unknown>) => Promise<{ data: unknown }>;
        }
      ).rpc("ss_rate_limit_hit", {
        _bucket: "contact_tap_forward",
        _identifier: ip,
        _window_seconds: 900,
        _max_hits: 20,
      });
      if (allowed === false) return { ok: false };

      const { forwardContactTapToCrm } = await import("./site-activity-forward.server");
      const res = await forwardContactTapToCrm({
        id: data.id,
        eventType: data.event_type,
        placement: data.placement ?? null,
        pagePath: data.page_path ?? null,
        sessionId: data.session_id ?? null,
        campaignId: data.campaign_id ?? null,
        utmSource: data.utm_source ?? null,
        utmMedium: data.utm_medium ?? null,
        utmCampaign: data.utm_campaign ?? null,
        utmTerm: data.utm_term ?? null,
        utmContent: data.utm_content ?? null,
        referrer: data.referrer ?? null,
        landingPage: data.landing_page ?? null,
      });
      return { ok: res.forwarded };
    } catch (err) {
      console.error("contact tap forward threw", err);
      return { ok: false };
    }
  });
