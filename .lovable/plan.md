# Verify lead field mapping into the CRM

## What the check found so far

Reading the intake endpoint, the forwarder, and the database:

- The website form sends: name, email, phone, address, postal code, preferred date/time, pool details, message, `source`, `page`, `utm_source/medium/campaign`, `sms_opt_in`, `contact_consent`, `consent_text`, `elapsed_ms`.
- The lead endpoint saves to `inspection_requests` and then forwards to the CRM endpoint at savvyswim.app.
- `inspection_requests` currently holds **0 rows**, and the delivery log `ss_webhook_deliveries` holds **0 rows**. So no lead has ever gone through this path end to end — the handoff has never actually been exercised or confirmed.

Gaps visible in the mapping itself:

1. **Consent is not a field, only prose.** `inspection_requests` has `sms_opt_in` but no `contact_consent` and no `consent_text` column. The authorization is written into the free-text `notes` and into the `ss_sms_consent` ledger. The CRM payload does send `contact_consent`, but there is no queryable consent column on the lead record itself.
2. **Attribution is partly dropped.** `inspection_requests` has `utm_term`, `utm_content`, `referrer`, `landing_page`, `session_id` — none of them are ever written, and the form never collects them.
3. **`source` has no home.** The form's `source` (which CTA produced the lead) is only used as a fallback for `utm_source` and to derive `lead_type` at forward time. Neither `source` nor `lead_type` is stored on the lead row.
4. **Timestamps.** Only `created_at` is sent (as `submitted_at`). There is no record of when the CRM accepted the lead other than the delivery log.

## Plan

### 1. Close the storage gaps (migration)
Add to `inspection_requests`: `contact_consent` (boolean, default false), `consent_text` (text), `source` (text), `lead_type` (text), and `crm_synced_at` (timestamp). Existing rows unaffected.

### 2. Capture the full attribution set
Update the lead form and endpoint to also collect and store `utm_term`, `utm_content`, `referrer`, `landing_page`, and `session_id`, so the columns that already exist stop sitting empty.

### 3. Write the new fields on intake
The endpoint stores consent as real columns (keeping the notes copy for readability), stores `source` and derived `lead_type`, and stamps `crm_synced_at` when the CRM confirms receipt.

### 4. Send a complete, flat payload to the CRM
Keep the existing keys for backward compatibility and add the missing ones: `source`, `consent_text`, full UTM set, `referrer`, `landing_page`, `session_id`, plus a flattened copy of each attribution key alongside the nested `attribution` object, so the CRM matches fields whichever shape it reads.

### 5. Prove it end to end
Run a real submission against the live endpoint with a marked test email, then confirm:
- the row in `inspection_requests` has every field populated as expected;
- a `ss_webhook_deliveries` row exists with the exact payload and the CRM's HTTP status;
- the consent record exists in `ss_sms_consent` with the verbatim wording.

Report the field-by-field result. If the CRM rejects any field name, adjust the payload key and re-test.

## Technical notes

- Files touched: `src/routes/api/public/leads.ts`, `src/lib/crm-lead-forward.server.ts`, `src/components/LeadForm.tsx`, one migration.
- The CRM endpoint lives in a separate project, so its accepted field names can only be confirmed from the live response recorded in `ss_webhook_deliveries` — that is why step 5 is part of the work, not an afterthought.
- No change to rate limiting, honeypot, Turnstile, or dedupe behavior.
