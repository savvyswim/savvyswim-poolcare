/**
 * Website → CRM lead handoff (server-only helper).
 *
 * Every lead captured on the marketing site, whatever CTA produced it, is
 * POSTed to the CRM app's public lead endpoint so sales works one inbox.
 * The URL can be overridden with CRM_LEADS_URL without a code change.
 */
const DEFAULT_CRM_LEADS_URL = "https://savvyswim.app/api/public/leads";

export type CrmForwardResult = { forwarded: boolean; status: number };

/** Pull the CRM's own row id out of its response so the office can cross-reference it. */
export function extractCrmLeadId(body: string): string | null {
  if (!body) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return null;
  }
  const seen = new Set<unknown>();
  const keys = ["crm_lead_id", "lead_id", "record_id", "row_id", "id", "uuid"];
  const walk = (node: unknown, depth: number): string | null => {
    if (!node || typeof node !== "object" || depth > 4 || seen.has(node)) return null;
    seen.add(node);
    if (Array.isArray(node)) {
      for (const item of node) {
        const found = walk(item, depth + 1);
        if (found) return found;
      }
      return null;
    }
    const obj = node as Record<string, unknown>;
    for (const key of keys) {
      const v = obj[key];
      if (typeof v === "string" && v.trim()) return v.trim();
      if (typeof v === "number") return String(v);
    }
    for (const v of Object.values(obj)) {
      const found = walk(v, depth + 1);
      if (found) return found;
    }
    return null;
  };
  return walk(parsed, 0);
}

/** Normalize a form source into a coarse lead type the CRM can route on. */
export function leadTypeFromSource(source?: string | null): string {
  const s = (source ?? "").toLowerCase();
  if (s.includes("water")) return "water_test";
  return "free_inspection";
}

/** The CRM rejects any text field longer than this. */
export const CRM_TEXT_LIMIT = 2000;

/**
 * Survey write ups repeat the full consent paragraph, which blows past the
 * CRM's 2000 character limit and gets the whole lead rejected. Drop the
 * repeated consent block (the CRM already gets it in consent_text), collapse
 * the blank lines, then hard trim what is left.
 */
export function trimForCrm(value: string | null | undefined, consent?: string | null): string | null {
  if (typeof value !== "string") return null;
  let text = value;
  const block = (consent ?? "").trim();
  if (block.length > 120) {
    // The stored consent text ends with an "Accepted ..." audit line that is
    // not repeated inside the notes, so match on the wording itself.
    const core = block.split(" Accepted ")[0]!.trim();
    if (core.length > 120) text = text.split(core).join(" ");
  }
  text = text
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (!text) return null;
  if (text.length <= CRM_TEXT_LIMIT) return text;
  return `${text.slice(0, CRM_TEXT_LIMIT - 3).trimEnd()}...`;
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
      "id, reference_number, full_name, email, phone, address, postal_code, preferred_date, preferred_contact_time, pool_details, notes, created_at, utm_source, utm_medium, utm_campaign, utm_term, utm_content, referrer, landing_page, session_id, page_path, sms_opt_in, contact_consent, consent_text, source, lead_type, status",
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
  // Page bucket ("Frisco", but also "Home", "Services", "Booking link"). A
  // reporting label, not a service city.
  const pageCity = cityFromPath(pagePath, rawSource);
  const { cityFromAddress, stateFromAddress } = await import("./postal");
  // The CRM's `city` column is the service city, so it must come from the
  // property address; the page bucket is only a fallback when it names a real
  // service area.
  const addressCity = cityFromAddress(req.address);
  const { SERVICE_AREAS } = await import("./serviceAreas");
  const isServiceArea = SERVICE_AREAS.some(
    (a) => a.name.toLowerCase() === pageCity.toLowerCase(),
  );
  const city = addressCity || (isServiceArea ? pageCity : "") || null;
  const state = stateFromAddress(req.address) || null;

  const attribution = {
    source: cta,
    source_raw: req.source,
    cta,
    source_page: pagePath,
    page_city: pageCity,
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
    // Aliases so the CRM stores the email whichever column name it reads.
    email_address: req.email,
    contact_email: req.email,
    customer_email: req.email,
    lead_email: req.email,
    phone: req.phone,
    // Aliases so the CRM stores the phone whichever column name it reads.
    phone_number: req.phone,
    contact_phone: req.phone,
    customer_phone: req.phone,
    lead_phone: req.phone,
    mobile: req.phone,
    address: req.address,
    // `city` also arrives via the flat attribution spread below.

    state,
    channel: "website",
    postal_code: req.postal_code,
    zip: req.postal_code,

    preferred_date: req.preferred_date,
    preferred_contact_time: req.preferred_contact_time,
    pool_details: req.pool_details,
    notes: req.notes,
    message: req.notes,
    sms_opt_in: extra?.smsOptIn ?? req.sms_opt_in ?? false,
    contact_consent: extra?.contactConsent ?? req.contact_consent ?? false,
    consent_text: req.consent_text,
    lead_status: req.status ?? "new",
    status: req.status ?? "new",
    submitted_at: req.created_at,
    created_at: req.created_at,
    // Flat copies so the CRM matches whichever shape it reads..attribution,
    attribution,
  };


  // The CRM validator rejects explicit nulls, so omit empty fields entirely.
  const prune = (obj: Record<string, unknown>): Record<string, unknown> =>
    Object.fromEntries(
      Object.entries(obj)
        .filter(([, v]) => v !== null && v !== undefined)
        .map(([k, v]) => [
          k,
          v && typeof v === "object" && !Array.isArray(v)
            ? prune(v as Record<string, unknown>)
            : v,
        ]),
    );

  const requestBody = JSON.stringify(prune(payload));
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
    // The CRM verifies the shared secret verbatim in this header.
    headers["x-savvy-signature"] = token;
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
        const crmLeadId = extractCrmLeadId(lastBody);
        await supabaseAdmin
          .from("inspection_requests")
          .update({
            crm_synced_at: new Date().toISOString(),
            ...(crmLeadId ? { crm_lead_id: crmLeadId } : {}),
          })
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

