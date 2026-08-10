import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Website → CRM lead handoff.
 *
 * Every inspection request captured on the marketing site is POSTed to the
 * CRM app's public lead endpoint so sales works one inbox. The URL can be
 * overridden with CRM_LEADS_URL without a code change.
 */
const DEFAULT_CRM_LEADS_URL = "https://savvyservices.app/api/public/leads";

export const forwardLeadToCrm = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ requestId: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    const endpoint = process.env["CRM_LEADS_URL"] || DEFAULT_CRM_LEADS_URL;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: req, error } = await supabaseAdmin
      .from("inspection_requests")
      .select(
        "id, reference_number, full_name, email, phone, address, postal_code, preferred_date, preferred_contact_time, pool_details, notes, created_at, utm_source, utm_medium, utm_campaign, page_path",
      )
      .eq("id", data.requestId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!req) throw new Error("Request not found");

    const payload = {
      external_id: req.id,
      reference: req.reference_number,
      type: "free_inspection",
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

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });
      const body = await res.text();
      if (!res.ok) {
        console.error("CRM lead forward failed", res.status, body.slice(0, 500));
        return { forwarded: false as const, status: res.status };
      }
      const { logInspectionEvents } = await import("./inspection-events.server");
      await logInspectionEvents(req.id, [
        {
          eventType: "status_change",
          detail: `Lead forwarded to CRM (${endpoint})`,
          outcome: "sent",
        },
      ]);
      return { forwarded: true as const, status: res.status };
    } catch (e) {
      console.error("CRM lead forward error", e);
      return { forwarded: false as const, status: 0 };
    }
  });
