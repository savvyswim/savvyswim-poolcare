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
      "id, reference_number, full_name, email, phone, address, postal_code, preferred_date, preferred_contact_time, pool_details, notes, created_at, utm_source, utm_medium, utm_campaign, page_path, sms_opt_in",
    )
    .eq("id", requestId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!req) throw new Error("Request not found");

  const payload = {
    external_id: req.id,
    reference: req.reference_number,
    type: extra?.leadType || "free_inspection",
    lead_type: extra?.leadType || "free_inspection",
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
    sms_opt_in: extra?.smsOptIn ?? req.sms_opt_in ?? false,
    contact_consent: extra?.contactConsent ?? null,
    submitted_at: req.created_at,
    attribution: {
      utm_source: req.utm_source,
      utm_medium: req.utm_medium,
      utm_campaign: req.utm_campaign,
      page_path: req.page_path,
    },
  };

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = process.env["CRM_LEADS_TOKEN"];
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const { logWebhookDelivery } = await import("./webhook-log.server");
  const reference = `${req.reference_number ?? req.id} · ${req.full_name ?? "lead"}`;

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
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
