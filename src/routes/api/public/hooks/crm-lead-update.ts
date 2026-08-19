/**
 * Inbound webhook: CRM (savvyservices.app) → website.
 *
 * The CRM POSTs here when a lead's status changes or a note is added, so the
 * website's lead records (public.inspection_requests) stay in sync with what
 * the office sees in the CRM.
 *
 * Security: the caller must prove it holds CRM_WEBHOOK_SECRET (falls back to
 * OPS_HOOK_SECRET), with either
 *   X-Savvy-Signature: sha256=<hex hmac of the raw body>   (preferred)
 * or
 *   Authorization: Bearer <secret>
 *
 * Body (JSON):
 * {
 *   "event_id": "evt_123",          // optional, for logging/idempotency
 *   "lead_id": "<website lead uuid>",       // one of these three is required
 *   "reference_number": "SS-26-1034",
 *   "crm_lead_id": "<crm row id>",
 *   "status": "scheduled",          // new | scheduled | confirmed | declined | converted
 *   "note": "Spoke with customer, quoting Tuesday",
 *   "note_author": "Marcus",
 *   "updated_at": "2026-08-19T12:00:00Z"
 * }
 */
import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { logInspectionEvents } from "@/lib/inspection-events.server";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Savvy-Signature",
  "Access-Control-Max-Age": "86400",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

function authorized(request: Request, raw: string, secret: string): boolean {
  const sig = (request.headers.get("x-savvy-signature") ?? "").replace(/^sha256=/i, "").trim();
  if (sig) {
    const expected = createHmac("sha256", secret).update(raw).digest("hex");
    return safeEqual(sig.toLowerCase(), expected);
  }
  const bearer = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  return bearer.length > 0 && safeEqual(bearer, secret);
}

const STATUSES = ["new", "scheduled", "confirmed", "declined", "converted"] as const;

const payloadSchema = z
  .object({
    event_id: z.string().max(120).optional(),
    lead_id: z.string().uuid().optional(),
    reference_number: z.string().min(3).max(60).optional(),
    crm_lead_id: z.string().min(1).max(120).optional(),
    status: z.enum(STATUSES).optional(),
    note: z.string().min(1).max(4000).optional(),
    note_author: z.string().max(120).optional(),
    updated_at: z.string().max(40).optional(),
  })
  .refine((v) => v.lead_id || v.reference_number || v.crm_lead_id, {
    message: "lead_id, reference_number or crm_lead_id is required",
  })
  .refine((v) => v.status || v.note, { message: "status or note is required" });

export const Route = createFileRoute("/api/public/hooks/crm-lead-update")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        // WEBSITE_WEBHOOK_SECRET is the shared website <-> CRM secret already
        // configured for outbound lead pushes, so the CRM can reuse it here.
        const secrets = [
          process.env["CRM_WEBHOOK_SECRET"],
          process.env["WEBSITE_WEBHOOK_SECRET"],
          process.env["OPS_HOOK_SECRET"],
        ].filter((v): v is string => typeof v === "string" && v.length > 0);
        if (secrets.length === 0) {
          console.error("[crm-lead-update] no webhook secret configured");
          return json({ error: "not configured" }, 503);
        }

        const raw = await request.text();
        if (!secrets.some((s) => authorized(request, raw, s))) {
          return json({ error: "unauthorized" }, 401);
        }

        let parsed: z.infer<typeof payloadSchema>;
        try {
          parsed = payloadSchema.parse(JSON.parse(raw));
        } catch (err) {
          return json(
            { error: "invalid payload", detail: err instanceof Error ? err.message : "bad json" },
            400,
          );
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        let query = supabaseAdmin
          .from("inspection_requests")
          .select("id, status, notes, reference_number, crm_lead_id")
          .limit(1);
        if (parsed.lead_id) query = query.eq("id", parsed.lead_id);
        else if (parsed.reference_number) query = query.eq("reference_number", parsed.reference_number);
        else query = query.eq("crm_lead_id", parsed.crm_lead_id!);

        const { data: rows, error: findError } = await query;
        if (findError) {
          console.error("[crm-lead-update] lookup failed", findError.message);
          return json({ error: "lookup failed" }, 500);
        }
        const lead = rows?.[0];
        if (!lead) return json({ error: "lead not found" }, 404);

        type LeadPatch = Partial<{ status: string; crm_lead_id: string; crm_synced_at: string; notes: string; updated_at: string }>;
        const patch: LeadPatch = { updated_at: new Date().toISOString() };
        if (parsed.status && parsed.status !== lead.status) patch.status = parsed.status;
        if (parsed.crm_lead_id && parsed.crm_lead_id !== lead.crm_lead_id) {
          patch.crm_lead_id = parsed.crm_lead_id;
          patch.crm_synced_at = new Date().toISOString();
        }
        if (parsed.note) {
          const stamp = new Date().toISOString().slice(0, 16).replace("T", " ");
          const author = parsed.note_author?.trim() || "CRM";
          const line = `[${stamp} UTC · ${author}] ${parsed.note.trim()}`;
          patch.notes = lead.notes ? `${lead.notes}\n${line}` : line;
        }

        const { error: updateError } = await supabaseAdmin
          .from("inspection_requests")
          .update(patch)
          .eq("id", lead.id);
        if (updateError) {
          console.error("[crm-lead-update] update failed", updateError.message);
          return json({ error: "update failed" }, 500);
        }

        const events = [] as Parameters<typeof logInspectionEvents>[1];
        if (patch.status) {
          events.push({
            eventType: "status_change",
            channel: "crm_webhook",
            outcome: "applied",
            detail: parsed.event_id ? `event ${parsed.event_id}` : null,
            statusFrom: lead.status,
            statusTo: parsed.status ?? null,
          });
        }
        if (parsed.note) {
          events.push({
            eventType: "status_change",
            channel: "crm_webhook",
            outcome: "note",
            detail: parsed.note.slice(0, 500),
          });
        }
        await logInspectionEvents(lead.id, events);

        return json({
          ok: true,
          lead_id: lead.id,
          reference_number: lead.reference_number,
          status: patch.status ?? lead.status,
          note_added: Boolean(parsed.note),
        });
      },
    },
  },
});
