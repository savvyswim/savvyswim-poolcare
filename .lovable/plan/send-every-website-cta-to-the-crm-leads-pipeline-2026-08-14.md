# Send every website CTA to the CRM leads pipeline

## What's happening now

Every lead-capture CTA on the site (hero buttons, quote modal, water-test side tab, city pages, the legacy /book, /free-inspection and /request-inspection URLs) funnels into one form and one endpoint, and that endpoint saves the lead to the website's own inspection requests table.

The handoff to the CRM app exists in the code but is never called — nothing actually posts the lead to savvyswim.app. So new website leads never appear in the CRM leads list.

## The fix

1. Call the CRM handoff automatically on every successful lead save, right after the record is created — no CTA left out, since all CTAs share the same submission path.
2. Include the lead type in the payload so the CRM can tell a booking/quote request from a water-test request, and keep the source, page and campaign attribution that's already captured.
3. Log the handoff result (success or failure, with the CRM's response) to the existing webhook delivery log so failed pushes are visible in the CRM health screen instead of vanishing.
4. Never block the visitor: if the CRM is slow or down, the lead is still saved on the site and the form still confirms; the failure is only recorded for retry.
5. Add a small retry action so a lead that failed to reach the CRM can be pushed again from the existing webhook health view.

## Technical notes

- Extract the forwarding body of `src/lib/crm-lead-forward.functions.ts` into a server-only helper (`crm-lead-forward.server.ts`) and have both the server function and `src/routes/api/public/leads.ts` call it.
- Invoke it after the `inspection_requests` insert in the POST handler, awaited but wrapped so any error is logged, not returned.
- Extend the forwarded payload with `lead_type` (booking vs water_test, taken from the form's `source`) and `sms_opt_in` / `contact_consent` flags.
- Target URL stays `CRM_LEADS_URL` (default `https://savvyswim.app/api/public/leads`) with the optional `CRM_LEADS_TOKEN` bearer header.
- Delivery outcomes continue to write to `ss_webhook_deliveries` via `logWebhookDelivery`, so `src/lib/webhook-health.functions.ts` picks them up.
