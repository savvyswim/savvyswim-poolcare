# Bind the website lead form to the CRM lead pipeline

The website already captures every lead through one hardened endpoint and already
signs the handoff to the CRM. The only missing piece is the shared password that
both apps must hold, plus a live end-to-end confirmation.

## What happens after this

1. Visitor submits any form on the site (booking modal, water test tab, city pages).
2. The lead is saved on the website and immediately pushed to the CRM lead pipeline.
3. The CRM verifies the shared secret and creates the lead in its Leads / Marketing pipeline.
4. Success or failure is recorded on the website so nothing gets silently lost.

## Steps

1. **Create the shared value.** You generate one strong random value (a password
   manager, or `openssl rand -hex 32`). It must be the exact same string in both
   projects — Lovable never reveals a value it generates, so it has to come from you.
2. **Save it on the website.** I reopen the secure form and you paste it as
   `WEBSITE_WEBHOOK_SECRET`.
3. **Save it in the CRM.** In the CRM project, save the identical value under the
   name its lead endpoint expects (`WEBSITE_WEBHOOK_SECRET`).
4. **Make the CRM accept the lead.** The CRM currently answers
   "Lead intake is not configured" (503) — its lead endpoint must read the secret,
   compare it, and insert into the lead pipeline. That change is made in the CRM
   project, not here.
5. **Live test.** I submit a real lead through the site, confirm the CRM returns a
   success, and confirm the sync status turns green. Test records are cleaned up after.

## Technical notes

- Handoff lives in `src/lib/crm-lead-forward.server.ts`; it reads
  `CRM_LEADS_TOKEN` or `WEBSITE_WEBHOOK_SECRET` and sends the secret four ways
  (`Authorization: Bearer`, `x-website-secret`, `x-webhook-secret`, plus an
  HMAC-SHA256 `x-webhook-signature` over the raw body), so whichever scheme the
  CRM checks will match. No code change needed on this side.
- Target endpoint defaults to `https://savvyswim.app/api/public/leads`, overridable
  with `CRM_LEADS_URL`.
- Every attempt is logged to `ss_webhook_deliveries` with status and error text, and
  a successful sync stamps `inspection_requests.crm_synced_at`.

## Out of scope here

The CRM-side endpoint change (step 4) has to be done in the CRM project. If you want,
paste this plan there and I can pick it up from that side.
