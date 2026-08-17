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
  const attribution = {
    source: req.source,
    utm_source: req.utm_source,
    utm_medium: req.utm_medium,
    utm_campaign: req.utm_campaign,
    utm_term: req.utm_term,
    utm_content: req.utm_content,
    referrer: req.referrer,
    landing_page: req.landing_page,
    session_id: req.session_id,
    page_path: req.page_path,
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

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers,
      body: requestBody,
    });
    const body = await res.text();
    if (!res.ok) {
      console.error("CRM lead forward failed", res.status, body.slice(0, 500));
      await logWebhookDelivery({
        channel: "lead",
        eventKey: req.id,
        endpoint,
        reference,
        outcome: "failed",
        httpStatus: res.status,
        error: `CRM responded ${res.status}`,
        request: payload,
        response: body,
      });
      return { forwarded: false, status: res.status };
    }
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
      response: body,
    });
    return { forwarded: true, status: res.status };
  } catch (e) {
    console.error("CRM lead forward error", e);
    await logWebhookDelivery({
      channel: "lead",
      eventKey: req.id,
      endpoint,
      reference,
      outcome: "failed",
      httpStatus: 0,
      error: e instanceof Error ? e.message : String(e),
      request: payload,
    });
    return { forwarded: false, status: 0 };
  }
}
