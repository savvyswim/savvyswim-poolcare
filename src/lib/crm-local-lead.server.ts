/**
 * Writes every website request straight into the CRM's own lead list
 * (ss_leads) in the shared database, so savvyswim.com and savvyswim.app show
 * the same thing instantly. The HTTP send to the app stays as a backup.
 *
 * Dedupe: each lead carries "[ref SS-..]" in its message; otherwise match a
 * lead with the same phone digits or email created in the last 90 days.
 */
type Stage = "new_lead" | "contacted" | "quote_sent" | "follow_up" | "won" | "lost";

const digits = (v: string | null | undefined) => (v ?? "").replace(/\D/g, "").slice(-10);

export async function syncRequestToCrmLead(
  requestId: string,
  opts: { stage?: Stage; customerId?: string | null } = {},
): Promise<{ ok: boolean; leadId?: string; error?: string }> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: req } = await supabaseAdmin
      .from("inspection_requests")
      .select(
        "id, reference_number, full_name, phone, email, address, notes, source, lead_type, promo_code, preferred_date, converted_customer_id, utm_source, utm_campaign",
      )
      .eq("id", requestId)
      .maybeSingle();
    if (!req) return { ok: false, error: "Request not found" };

    const ref = req.reference_number ?? req.id;
    const marker = `[ref ${ref}]`;
    const email = req.email && !req.email.startsWith("no-email.") ? req.email.toLowerCase() : null;
    const phone = digits(req.phone);

    let leadId: string | null = null;
    const { data: byRef } = await supabaseAdmin
      .from("ss_leads")
      .select("id")
      .ilike("message", `%${marker}%`)
      .limit(1)
      .maybeSingle();
    leadId = byRef?.id ?? null;

    if (!leadId && (phone || email)) {
      const since = new Date(Date.now() - 90 * 864e5).toISOString();
      const { data: recent } = await supabaseAdmin
        .from("ss_leads")
        .select("id, phone, email, message")
        .gte("created_at", since)
        .limit(500);
      const hit = (recent ?? []).find(
        (l) => (phone && digits(l.phone) === phone) || (email && l.email?.toLowerCase() === email),
      );
      leadId = hit?.id ?? null;
      if (hit) {
        await supabaseAdmin
          .from("ss_leads")
          .update({ message: [hit.message, marker].filter(Boolean).join("\n") } as never)
          .eq("id", hit.id);
      }
    }

    const city = (req.address ?? "").split(",").map((s) => s.trim())[1] ?? null;
    const noteParts = [
      marker,
      req.lead_type ? `Type: ${req.lead_type}` : null,
      req.preferred_date ? `Requested day: ${req.preferred_date}` : null,
      req.utm_source ? `Campaign: ${req.utm_source}${req.utm_campaign ? " / " + req.utm_campaign : ""}` : null,
      req.notes,
    ].filter(Boolean);
    const customerId = opts.customerId ?? req.converted_customer_id ?? null;

    if (leadId) {
      const patch: Record<string, unknown> = {};
      if (opts.stage) patch["stage"] = opts.stage;
      if (customerId) patch["converted_customer_id"] = customerId;
      if (Object.keys(patch).length) {
        await supabaseAdmin.from("ss_leads").update(patch as never).eq("id", leadId);
      }
      return { ok: true, leadId };
    }

    const { data: created, error } = await supabaseAdmin
      .from("ss_leads")
      .insert({
        full_name: req.full_name ?? "Website visitor",
        phone: req.phone,
        email,
        address: req.address,
        city,
        message: noteParts.join("\n"),
        source: `website:${req.source ?? "form"}`,
        promo_code: req.promo_code,
        stage: opts.stage ?? (customerId ? "won" : "new_lead"),
        converted_customer_id: customerId,
      } as never)
      .select("id")
      .single();
    if (error) return { ok: false, error: error.message };
    await addLeadToInbox({
      ref,
      name: req.full_name ?? "Website visitor",
      email,
      phone: req.phone,
      customerId,
      body: [`New website request ${ref}`, `Phone: ${req.phone ?? "Not given"}`, `Address: ${req.address ?? "Not given"}`, ...noteParts.slice(1)].join("\n"),
    });
    return { ok: true, leadId: created.id as string };
  } catch (err) {
    console.error("syncRequestToCrmLead failed", err);
    return { ok: false, error: err instanceof Error ? err.message : "unknown" };
  }
}

/**
 * Puts a new lead into the app's email inbox as an incoming conversation.
 * The inbox tables arrive with the app merge; until then this quietly skips.
 */
async function addLeadToInbox(l: {
  ref: string;
  name: string;
  email: string | null;
  phone: string | null;
  customerId: string | null;
  body: string;
}) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabaseAdmin as unknown as { from: (t: string) => any };
    const subject = `New website request ${l.ref}, ${l.name}`;
    const { data: existing, error: lookErr } = await db
      .from("ss_email_threads")
      .select("id")
      .eq("subject", subject)
      .limit(1)
      .maybeSingle();
    if (lookErr || existing) return;
    const participant = l.email ?? `no-email.${l.ref}@savvyswim.com`;
    const { data: thread, error } = await db
      .from("ss_email_threads")
      .insert({
        customer_id: l.customerId,
        participant_email: participant,
        participant_name: l.name,
        subject,
        unread_count: 1,
        last_direction: "in",
        last_snippet: l.body.slice(0, 140),
      })
      .select("id")
      .single();
    if (error || !thread) return;
    await db.from("ss_email_messages").insert({
      thread_id: thread.id,
      direction: "in",
      from_email: participant,
      from_name: l.name,
      to_email: "hi@savvyswim.com",
      subject,
      body_text: l.body,
    });
  } catch (err) {
    console.error("addLeadToInbox skipped", err);
  }
}
