# Everything from the website into the SavvySwim app

Goal: every single thing a visitor does on the website lands in savvyswim.app automatically, including the survey, with a way to see anything that did not make it.

## What already goes over

Quote form, booking page, schedule page, water test, city page forms and the survey all save a lead on the website and are then pushed to savvyswim.app right away. The survey is included today, so the first job is proving it rather than rebuilding it.

## What does not go over today

- Reviews left on the website stay on the website only.
- Call and text taps are recorded on the website only, so the app never sees that someone tried to reach you.
- If a push to the app fails (app asleep, hiccup, bad data), it sits there until somebody notices and presses resend by hand. Nothing retries on its own.

## The work

### 1. Prove the survey and every form really lands in the app

Send one real test through each entry point on the live site: survey, quote pop up, booking page, schedule page, water test, and a city page form. For each one, confirm the lead appears in savvyswim.app with the name, phone, email, address, the survey answers, the campaign tags and the consent record intact. Report back exactly which ones passed and fix any that did not.

### 2. Automatic retry, no more silent misses

Anything that fails to reach the app retries on its own on a short schedule, a few times with growing gaps, then flags itself as needing attention. Nothing is lost because the app was briefly unreachable.

### 3. Send the rest of the website over too

- Website reviews get pushed to the app attached to the matching customer or lead, with the rating, the text and the person's name.
- Call and text taps get pushed as a contact activity, so the app shows that someone reached out even when they never filled a form.

### 4. One page that shows the truth

A single admin page "Website to app" listing everything the website captured, what kind it was, when it went over, whether the app accepted it, the app's own record number, and a resend button for anything that failed. It replaces guessing with a green or red line per item.

## Technical notes

- Handoff already lives in `src/lib/crm-lead-forward.server.ts` posting to `https://savvyswim.app/api/public/leads`, called from `src/routes/api/public/leads.ts`. Attempts are logged to `ss_webhook_deliveries`.
- Retry: a `/api/public/hooks/retry-crm-forwards` route driven by a schedule, picking up failed deliveries and re-calling `forwardInspectionToCrm`, with attempt count and backoff already stored on the delivery row.
- Reviews (`ss_site_reviews`) and contact taps (`contact_events`) get their own forwarders reusing the same delivery logging and retry path.
- The new admin page builds on the existing `lead-sync.functions.ts` reader, widened to cover the extra kinds.
- The live tests run against the published site, since the editor sandbox has no backend service key.
