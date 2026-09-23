/**
 * Website activity handoff to the SavvySwim app (server-only).
 *
 * Leads have their own forwarder in crm-lead-forward.server.ts. This one
 * carries everything else the website captures: reviews left on the site and
 * click-to-call / click-to-text taps, so the app shows a person reaching out
 * even when they never filled in a form.
 *
 * Every attempt is written to ss_webhook_deliveries, so the admin page and the
 * automatic retry job can both see what did and did not land.
 */
const DEFAULT_CRM_LEADS_URL = "https://savvyswim.app/api/public/leads";

export type SiteActivityChannel = "review" | "contact";

export type SiteActivityResult = { forwarded: boolean; status: number };

export function crmEndpoint(): string {
  return process.env["CRM_LEADS_URL"] || DEFAULT_CRM_LEADS_URL;
}

/** The shared secret is sent in every shape the app might verify. */
async function buildHeaders(body: string): Promise<Record<string, string>> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = process.env["CRM_LEADS_TOKEN"] || process.env["WEBSITE_WEBHOOK_SECRET"];
  if (!token) return headers;
  headers["Authorization"] = `Bearer ${token}`;
  headers["x-website-secret"] = token;
  headers["x-webhook-secret"] = token;
  const { createHmac } = await import("crypto");
  const signature = createHmac("sha256", token).update(body).digest("hex");
  headers["x-webhook-signature"] = signature;
  headers["x-signature"] = `sha256=${signature}`;
  headers["x-savvy-signature"] = token;
  return headers;
}

/** Drop empty fields, the app's validator rejects explicit nulls. */
function prune(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(obj)
      .filter(([, v]) => v !== null && v !== undefined && v !== "")
      .map(([k, v]) => [
        k,
        v && typeof v === "object" && !Array.isArray(v)
          ? prune(v as Record<string, unknown>)
          : v,
      ]),
  );
}

/**
 * POSTs one activity record to the app and records the attempt. Safe to call
 * again with the same eventKey, a repeat counts as a retry on the same row.
 */
export async function postSiteActivity(input: {
  channel: SiteActivityChannel;
  eventKey: string;
  reference: string;
  payload: Record<string, unknown>;
  isRetry?: boolean;
}): Promise<SiteActivityResult> {
  const endpoint = crmEndpoint();
  const payload = prune(input.payload);
  const body = JSON.stringify(payload);
  const headers = await buildHeaders(body);
  const { logWebhookDelivery } = await import("./webhook-log.server");

  let lastStatus = 0;
  let lastBody = "";
  let lastError = "";

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(endpoint, { method: "POST", headers, body });
      lastStatus = res.status;
      lastBody = await res.text();
      if (res.ok) {
        await logWebhookDelivery({
          channel: input.channel,
          eventKey: input.eventKey,
          endpoint,
          reference: input.reference,
          outcome: "success",
          httpStatus: res.status,
          request: payload,
          response: lastBody,
          isRetry: input.isRetry === true,
        });
        return { forwarded: true, status: res.status };
      }
      lastError = `App responded ${res.status}`;
      if (res.status < 500 && res.status !== 408 && res.status !== 429) break;
    } catch (e) {
      lastStatus = 0;
      lastError = e instanceof Error ? e.message : String(e);
    }
    if (attempt < 3) await new Promise((r) => setTimeout(r, attempt * 750));
  }

  await logWebhookDelivery({
    channel: input.channel,
    eventKey: input.eventKey,
    endpoint,
    reference: input.reference,
    outcome: "failed",
    httpStatus: lastStatus,
    error: lastError || "App handoff failed",
    request: payload,
    response: lastBody || null,
    isRetry: input.isRetry === true,
  });
  return { forwarded: false, status: lastStatus };
}

/** Send one website review over to the app. */
export async function forwardReviewToCrm(review: {
  id: string;
  rating: number;
  body: string;
  author_name: string;
  author_city?: string | null;
  contact_email?: string | null;
  page_path?: string | null;
  created_at?: string | null;
}): Promise<SiteActivityResult> {
  const note = `Website review, ${review.rating} of 5 stars: ${review.body}`.slice(0, 2000);
  return postSiteActivity({
    channel: "review",
    eventKey: review.id,
    reference: `review · ${review.author_name}`,
    payload: {
      external_id: review.id,
      type: "website_review",
      lead_type: "website_review",
      origin: "savvyswim.com",
      channel: "website",
      full_name: review.author_name,
      email: review.contact_email ?? null,
      email_address: review.contact_email ?? null,
      city: review.author_city ?? null,
      rating: review.rating,
      notes: note,
      message: note,
      submitted_at: review.created_at ?? new Date().toISOString(),
      attribution: {
        source: "website_review",
        page_path: review.page_path ?? null,
      },
    },
  });
}

/** Send one click-to-call or click-to-text tap over to the app. */
export async function forwardContactTapToCrm(tap: {
  id: string;
  eventType: "call_click" | "text_click";
  placement?: string | null;
  pagePath?: string | null;
  sessionId?: string | null;
  campaignId?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmTerm?: string | null;
  utmContent?: string | null;
  referrer?: string | null;
  landingPage?: string | null;
}): Promise<SiteActivityResult> {
  const label = tap.eventType === "call_click" ? "called" : "texted";
  const note = `Visitor ${label} us from ${tap.pagePath || "the website"}${
    tap.placement ? ` (${tap.placement})` : ""
  }.`;
  return postSiteActivity({
    channel: "contact",
    eventKey: tap.id,
    reference: `${tap.eventType} · ${tap.pagePath ?? "/"}`,
    payload: {
      external_id: tap.id,
      type: tap.eventType === "call_click" ? "call_tap" : "text_tap",
      lead_type: "contact_tap",
      origin: "savvyswim.com",
      channel: "website",
      notes: note,
      message: note,
      submitted_at: new Date().toISOString(),
      attribution: {
        source: tap.eventType,
        placement: tap.placement ?? null,
        page_path: tap.pagePath ?? null,
        session_id: tap.sessionId ?? null,
        campaign_id: tap.campaignId ?? null,
        utm_source: tap.utmSource ?? null,
        utm_medium: tap.utmMedium ?? null,
        utm_campaign: tap.utmCampaign ?? null,
        utm_term: tap.utmTerm ?? null,
        utm_content: tap.utmContent ?? null,
        referrer: tap.referrer ?? null,
        landing_page: tap.landingPage ?? null,
      },
    },
  });
}
