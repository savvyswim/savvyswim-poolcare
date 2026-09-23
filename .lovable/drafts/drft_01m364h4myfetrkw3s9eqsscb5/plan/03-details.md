## What changes

**1. Stop the survey rejection.** Trim the long survey write up before it is
sent so it fits the CRM's limit, keeping the answers and dropping the repeated
consent paragraph, which the CRM already receives in its own field. Then resend
the rejected lead so it appears in the pipeline.

**2. Send the consultation day and time.** When someone picks a day and arrival
time on the thank you page, push the updated lead to the CRM straight away, so
the CRM record shows the same appointment we do.

**3. Send traffic and ad numbers.** Once a day, post a small summary to the CRM:
page views, leads and booked leads, broken down by channel (Meta ads, Meta
organic, Google Ads, Google organic, direct) and by campaign. No personal
details, just counts.

**4. Use your address and key.** You give me the CRM address and access key and
I save them securely, so nothing sensitive sits in the code.

## What I need from you

- The CRM address for leads, for example `https://savvyswim.app/api/public/leads`
  if that is still right.
- The access key the CRM expects.
- The CRM address for the daily traffic summary, if it has a separate one. If it
  does not exist yet, tell me and I will say exactly what the CRM needs to
  accept.

## Technical notes

- `src/lib/crm-lead-forward.server.ts`: cap the `message` field at the CRM's
  2000 character limit (strip the duplicated consent block first, then trim with
  an ellipsis), so survey leads stop failing validation.
- Consultation picks: after `saveConsultationSlot` updates the request, call
  `forwardInspectionToCrm` for that request id so the CRM sees the new
  `preferred_date` and `preferred_contact_time`.
- Traffic: reuse the channel classification in `src/lib/ads-performance.server.ts`
  and add a server function plus a scheduled call that posts the daily roll up
  to a `CRM_ANALYTICS_URL`, signed with the same shared key.
- Secrets: store `CRM_LEADS_URL`, `CRM_LEADS_TOKEN` and, if used,
  `CRM_ANALYTICS_URL`. The code already prefers `CRM_LEADS_URL` and
  `CRM_LEADS_TOKEN` over the current defaults.
- Every send keeps going through `logWebhookDelivery`, so the admin lead sync
  page shows successes and failures.
