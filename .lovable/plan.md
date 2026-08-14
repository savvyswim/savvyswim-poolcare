# Admin view: lead CRM sync status

## What you get

A new internal page at `/admin/lead-sync` (office/owner sign-in only, hidden from search engines) that lists every website lead with:

- Lead name, phone/email, reference number, when it came in, and which CTA produced it
- CRM sync status: Synced, Failed, or Never attempted
- Last attempt time and number of attempts
- Error details: HTTP status, error message, and the CRM's response text (expandable per row)
- A "Push to CRM" / "Retry" button per row, with the result shown inline

Filters at the top: All / Failed / Never sent / Synced, plus a name/phone/email search box and a time range (24h, 7d, 30d).

Counters across the top: leads in range, synced, failed, never attempted.

## How it works

Leads live in the site's `inspection_requests` table; the CRM handoff outcome is already recorded in `ss_webhook_deliveries` (channel `lead`, `event_key` = the lead id). The page joins those two, so a lead with no delivery row shows as "Never attempted" instead of disappearing.

This complements the existing Webhook Health page: that one is channel-level health, this one is lead-by-lead.

## Technical notes

- New `src/lib/lead-sync.functions.ts`:
  - `getLeadSyncStatus` — `createServerFn` with `requireSupabaseAuth`, `ss_is_office()` check (same `assertOffice` pattern as `webhook-health.functions.ts`), reads `inspection_requests` in the chosen range via `supabaseAdmin`, then fetches matching `ss_webhook_deliveries` rows where `channel = 'lead'` and `event_key in (...)`, and returns merged rows plus counts.
  - `pushLeadToCrm` — office-gated, takes a lead id, calls `forwardInspectionToCrm` from `crm-lead-forward.server.ts` (which already logs to `ss_webhook_deliveries`), returns the result.
- New route `src/routes/admin/lead-sync.tsx`, mirroring `admin/webhook-health.tsx`: same sign-in gate, Riviera styling (burgundy/cream/aqua, square corners), `noindex` head metadata with its own title/description/OG tags.
- Add a cross-link between the two admin pages.
- No database changes needed.
