# Full lead-flow test: every CTA → hardened endpoint → local + CRM lead

Goal: prove that every button on the site that captures a lead ends up as a row in the local leads table AND as a forwarded lead in the CRM, and produce a clear pass/fail report per CTA.

## What gets tested

Every CTA currently wired to the on-site quote form:

- Home page: hero quote button, mid-page quote band, "Get my quote", water-test tab
- Services page: three quote buttons
- Weekly Pool Service page: three quote buttons
- City landing pages (e.g. /plano, /frisco): three quote buttons
- Sticky side Water Test tab (booking vs water_test variant)
- Swim Club "Claim the summer offer" (falls back to the form with the membership preselected)

All of these funnel through one form component and one endpoint, so the test proves both the wiring of each button (right source tag, right variant, right preselected service) and the shared endpoint behaviour.

## How it will be tested

1. **Browser pass (real user path).** Drive the live preview with a headless browser. For each CTA: click it, confirm the form opens with the expected variant/preselected service, fill it with a uniquely tagged test identity, and submit. Respect the anti-bot rules the endpoint enforces (minimum fill time, honeypot left empty) so submissions are treated as real. Use a distinct email per CTA so the 10-minute duplicate collapse and the per-email rate limit do not mask results — and stay under the per-IP hourly cap by batching, with waits between batches if needed.
2. **Endpoint pass (contract checks).** Post directly to the lead endpoint to confirm the hardening still behaves: honeypot filled → quiet accept with no lead row, submitted too fast → quiet accept with no lead row, invalid payload → validation error, duplicate email inside the window → deduped response, over the limit → rate-limited response.
3. **Database verification.** For each submitted lead, read the stored row back and confirm every field landed: name, email, phone, address, postal code, preferred date/time, pool details, notes, source, lead type, consent flag, verbatim consent wording, SMS opt-in, all UTM fields, referrer, landing page, session id, page path. Confirm the consent record was written for leads with a phone number.
4. **CRM handoff verification.** For each lead, check the delivery log for the forwarding attempt: endpoint hit, HTTP status, payload sent, response body, and whether the lead was stamped as synced. A lead is only "CRM created" when the forward returns success and the sync stamp is set.
5. **Cleanup.** Delete every test lead, consent record, delivery log row and event row created by the run so the CRM inbox and analytics stay clean.

## Known blocker to expect

The CRM's public lead endpoint previously answered "Lead intake is not configured" (503). If that is still the case, the local side will pass and the CRM side will fail for every CTA — the test will report that explicitly rather than hiding it, and the failures remain retryable from the delivery log. Fixing the CRM endpoint is work in the other project, not this one.

## Deliverable

A per-CTA results table: CTA → form opened correctly → endpoint response → local lead row → field completeness → CRM forward status. Plus the hardening checks pass/fail, and a plain statement of anything broken and where.

## Technical notes

- Test path: `src/components/LeadForm.tsx` → `POST /api/public/leads` → `inspection_requests` insert → `src/lib/crm-lead-forward.server.ts` → CRM endpoint → `ss_webhook_deliveries` + `crm_synced_at`.
- Browser automation runs against the local dev server; verification uses read-only database queries plus a data-only cleanup at the end.
- No production code changes are part of this task. If the test uncovers a bug (wrong source tag, dropped field, broken button), it will be reported and fixed as a follow-up, called out separately.
