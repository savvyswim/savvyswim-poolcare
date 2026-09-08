# Free-inspection leads → CRM + your inbox

## One thing to know first

Google does not let a business push its own website leads into its Google
listing. The listing only ever shows activity Google itself created (calls from
the listing, Google messages, direction taps). So "quote requests appearing in
our local listings" is not something Google allows anyone to build.

What is achievable, and what this plan does: every free-inspection request
lands in the CRM and in your inbox, and requests that came *from* the Google
listing are labelled as such so you can see what Google is actually producing.

## Current state (verified)

- Quote forms post to the site's own lead endpoint, which saves the request,
  forwards it to the CRM, and sends an office alert plus a homeowner
  confirmation. Both handoffs already exist.
- Office alerts currently go to one address only: `marcus@santanariveragroup.com`.
- 8 requests total; the most recent is 18 Aug. CRM handoffs: 7 succeeded,
  6 failed earlier with a service-unavailable error. 4 alert emails sent,
  3 failed. No traffic since then, so neither path is proven healthy today.

## Before I build — one confirmation

You gave `marcus@santanarivera.com`. The address already configured is
`marcus@santanariveragroup.com` (…riveragroup). If the new one is a typo, say
so and I will keep the existing address; otherwise I add the new one alongside
it and both get every lead.

## What I will build

1. **Your inbox on every lead.** Add your address to the office alert list so
   each free-inspection and water-test request emails you with name, phone,
   email, pool address, preferred date and time, notes, and where on the site
   it came from. Reply goes straight back to the homeowner.

2. **CRM handoff made reliable.** Every request already posts to the CRM. I
   add an automatic retry for the failures that previously happened
   (service-unavailable), so a temporary CRM outage no longer loses a lead, and
   a plain "Lead delivery" panel in the admin area showing, per request,
   whether the CRM copy and the email alert went through, with a Resend button.

3. **Google-sourced leads labelled.** Point the website link, booking link and
   review link on your Google listing at tagged URLs. Any visitor arriving from
   the listing carries that tag into their request, so the CRM and the lead
   sources screen show a "Google Business" line with its own count.

4. **A live end-to-end test.** I submit a real test request on the site and
   confirm it appears in the CRM and in your inbox, then remove the test row.

## What you will do on Google

Short list I will hand you with the exact URLs to paste: set the website link,
turn on the booking/quote link, and set the review link — all three tagged so
they show up as Google-sourced.

## Technical notes

- Office recipients come from `ss_settings.office_notification_emails`; adding
  the address is a settings update, no code change to the email builder.
- Retry: reuse the existing `ss_webhook_deliveries` record plus the existing
  lead-sync retry helper; add bounded backoff on 5xx in the lead endpoint's CRM
  step, keeping it non-blocking for the visitor.
- Delivery panel reads `ss_webhook_deliveries` and `inspection_events` per
  request; resend calls the existing forward and notify server functions.
- Google tagging uses the existing UTM capture in the lead endpoint
  (`utm_source=google_business`) surfaced through `lead-sources`.
- No Google Business Profile connector is needed; nothing is written to Google.
