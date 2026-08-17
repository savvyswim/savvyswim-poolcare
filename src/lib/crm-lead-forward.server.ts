/**
 * Website → CRM lead handoff (server-only helper).
 *
 * Every lead captured on the marketing site — whatever CTA produced it — is
 * POSTed to the CRM app's public lead endpoint so sales works one inbox.
 * The URL can be overridden with CRM_LEADS_URL without a code change.
 */
const DEFAULT_CRM_LEADS_URL = "https://savvyswim.app/api/public/leads";

export type CrmForwardResult = { forwarded: boolean; status: number };

/** Normalize a form source into a coarse lead type the CRM can route on. */
export function leadTypeFromSource(source?: string | null): string {
  const s = (source ?? "").toLowerCase();
  if (s.includes("water")) return "water_test";
  return "free_inspection";
}

export async function forwardInspectionToCrm(
  requestId: string,
  extra?: { leadType?: string | null; smsOptIn?: boolean | null; contactConsent?: boolean | null },
): Promise<CrmForwardResult> {
  const endpoint = process.env["CRM_LEADS_URL"] || DEFAULT_CRM_LEADS_URL;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: req, error } = await supabaseAdmin
    .from("inspection_requests")
    .select(
      "id, reference_number, full_name, email, phone, address, postal_code, preferred_date, preferred_contact_time, pool_details, notes, created_at, utm_source, utm_medium, utm_campaign, utm_term, utm_content, referrer, landing_page, session_id, page_path, sms_opt_in, contact_consent, consent_text, source, lead_type",
    )
    .eq("id", requestId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!req) throw new Error("Request not found");

  const leadType = extra?.leadType || req.lead_type || "free_inspection";

  // Sources are stamped "<cta>:<page>" (e.g. "weekly_hub_hero:/weekly-pool-service").
  // Split them so the CRM pipeline can filter by button and by page/city without
  // parsing strings on its side.
  const rawSource = req.source ?? "";
  const [ctaRaw, sourcePageRaw] = rawSource.split(":");
  const cta = (ctaRaw || rawSource || "site").slice(0, 80);
  const pagePath = (sourcePageRaw || req.page_path || req.landing_page || "/").split("?")[0]!;
  const { cityFromPath } = await import("./lead-sources.server");
  const city = cityFromPath(pagePath, rawSource);

  const attribution = {
    source: req.source,
    cta,
    source_page: pagePath,
    city,
    utm_source: req.utm_source,
    utm_medium: req.utm_medium,
    utm_campaign: req.utm_campaign,
    utm_term: req.utm_term,
    utm_content: req.utm_content,
    referrer: req.referrer,
    landing_page: req.landing_page,
    session_id: req.session_id,
    page_path: req.page_path || pagePath,
  };


  const payload = {
    external_id: req.id,
    reference: req.reference_number,
    type: leadType,
    lead_type: leadType,
    origin: "savvyswim.com",
    full_name: req.full_name,
    email: req.email,
    phone: req.phone,
    address: req.address,
    postal_code: req.postal_code,
    preferred_date: req.preferred_date,
    preferred_contact_time: req.preferred_contact_time,
    pool_details: req.pool_details,
    notes: req.notes,
    message: req.notes,
    sms_opt_in: extra?.smsOptIn ?? req.sms_opt_in ?? false,
    contact_consent: extra?.contactConsent ?? req.contact_consent ?? false,
    consent_text: req.consent_text,
    submitted_at: req.created_at,
    created_at: req.created_at,
    // Flat copies so the CRM matches whichever shape it reads.
    ...attribution,
    attribution,
  };


  const requestBody = JSON.stringify(payload);
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  // One shared secret, sent in every shape the CRM might verify: bearer token,
  // plain header, and an HMAC-SHA256 signature over the raw body.
  const token = process.env["CRM_LEADS_TOKEN"] || process.env["WEBSITE_WEBHOOK_SECRET"];
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
    headers["x-website-secret"] = token;
    headers["x-webhook-secret"] = token;
    const { createHmac } = await import("crypto");
    const signature = createHmac("sha256", token).update(requestBody).digest("hex");
    headers["x-webhook-signature"] = signature;
    headers["x-signature"] = `sha256=${signature}`;
  }


  const { logWebhookDelivery } = await import("./webhook-log.server");
  const reference = `${req.reference_number ?? req.id} · ${req.full_name ?? "lead"}`;

  // Bounded retry: transient CRM downtime should never drop a lead.
  const attempts = 3;
  let lastStatus = 0;
  let lastBody = "";
  let lastError = "";

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const res = await fetch(endpoint, { method: "POST", headers, body: requestBody });
      lastStatus = res.status;
      lastBody = await res.text();

      if (res.ok) {
        await supabaseAdmin
          .from("inspection_requests")
          .update({ crm_synced_at: new Date().toISOString() })
          .eq("id", req.id);
        const { logInspectionEvents } = await import("./inspection-events.server");
        await logInspectionEvents(req.id, [
          {
            eventType: "status_change",
            detail: `Lead forwarded to CRM (${endpoint})`,
            outcome: "sent",
          },
        ]);
        await logWebhookDelivery({
          channel: "lead",
          eventKey: req.id,
          endpoint,
          reference,
          outcome: "success",
          httpStatus: res.status,
          request: payload,
          response: lastBody,
        });
        return { forwarded: true, status: res.status };
      }

      lastError = `CRM responded ${res.status}`;
      console.error("CRM lead forward failed", res.status, lastBody.slice(0, 500));
      // 4xx other than 408/429 will not succeed on retry.
      if (res.status < 500 && res.status !== 408 && res.status !== 429) break;
    } catch (e) {
      lastStatus = 0;
      lastError = e instanceof Error ? e.message : String(e);
      console.error("CRM lead forward error", lastError);
    }

    if (attempt < attempts) {
      await new Promise((r) => setTimeout(r, attempt * 750));
    }
  }

  await logWebhookDelivery({
    channel: "lead",
    eventKey: req.id,
    endpoint,
    reference,
    outcome: "failed",
    httpStatus: lastStatus,
    error: lastError || "CRM handoff failed",
    request: payload,
    response: lastBody || null,
  });
  return { forwarded: false, status: lastStatus };
}

/** Re-send a lead that previously failed to reach the CRM. */
export async function retryInspectionToCrm(requestId: string): Promise<CrmForwardResult> {
  return forwardInspectionToCrm(requestId);
}

