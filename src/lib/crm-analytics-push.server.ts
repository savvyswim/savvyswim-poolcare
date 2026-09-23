/**
 * Daily traffic roll up for the CRM (server only).
 *
 * Posts counts, never personal details: visits, leads and booked leads by
 * channel (Meta ads, Meta organic, Google Ads, Google organic, direct) and by
 * campaign. The CRM address comes from CRM_ANALYTICS_URL, falling back to the
 * lead endpoint's host with /api/public/analytics.
 */
const DEFAULT_CRM_BASE = "https://savvyswim.app";

export type CrmAnalyticsResult = {
  sent: boolean;
  status: number;
  endpoint: string;
  detail?: string;
};

function analyticsEndpoint(): string {
  const explicit = process.env["CRM_ANALYTICS_URL"];
  if (explicit) return explicit;
  const leads = process.env["CRM_LEADS_URL"];
  if (leads) {
    try {
      return new URL("/api/public/analytics", leads).toString();
    } catch {
      /* fall through to the default */
    }
  }
  return `${DEFAULT_CRM_BASE}/api/public/analytics`;
}

export async function pushDailyTrafficToCrm(): Promise<CrmAnalyticsResult> {
  const endpoint = analyticsEndpoint();
  const { loadAdsPerformance } = await import("./ads-performance.server");
  const report = await loadAdsPerformance("7d");

  const body = JSON.stringify({
    origin: "savvyswim.com",
    kind: "traffic_daily",
    generated_at: new Date().toISOString(),
    window_days: 7,
    totals: {
      visits: report.totalVisits,
      leads: report.totalLeads,
      booked: report.totalBooked,
    },
    channels: report.channels.map((c) => ({
      channel: c.key,
      visits: c.visits,
      leads: c.leads,
      booked: c.booked,
      lead_rate: c.leadRate,
      book_rate: c.bookRate,
      campaigns: c.campaigns.map((k) => ({
        campaign: k.key,
        visits: k.visits,
        leads: k.leads,
        booked: k.booked,
      })),
    })),
  });

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = process.env["CRM_LEADS_TOKEN"] || process.env["WEBSITE_WEBHOOK_SECRET"];
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
    headers["x-website-secret"] = token;
    headers["x-savvy-signature"] = token;
    const { createHmac } = await import("crypto");
    headers["x-webhook-signature"] = createHmac("sha256", token).update(body).digest("hex");
  }

  const { logWebhookDelivery } = await import("./webhook-log.server");
  const reference = `traffic ${new Date().toISOString().slice(0, 10)}`;

  try {
    const res = await fetch(endpoint, { method: "POST", headers, body });
    const text = await res.text();
    await logWebhookDelivery({
      channel: "ops",
      eventKey: reference,
      endpoint,
      reference,
      outcome: res.ok ? "success" : "failed",
      httpStatus: res.status,
      request: JSON.parse(body),
      response: text.slice(0, 2000),
      error: res.ok ? null : `CRM responded ${res.status}`,
    });
    return { sent: res.ok, status: res.status, endpoint, detail: text.slice(0, 300) };
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    await logWebhookDelivery({
      channel: "ops",
      eventKey: reference,
      endpoint,
      reference,
      outcome: "failed",
      httpStatus: 0,
      request: JSON.parse(body),
      error: detail,
    });
    return { sent: false, status: 0, endpoint, detail };
  }
}
