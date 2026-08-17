# Fix desktop calling + guarantee every lead reaches the CRM

## 1. Why the phone links still open a dead page

Confirmed on your machine: the browser reports a Mac (Safari, no touch support) but the page width is 768px. The current rule treats anything 820px or narrower as a phone, so it skips the branded call card and lets the raw `tel:` link fire — Safari then opens a tab that goes nowhere.

Fix: decide by device capability, not window width.

- A device counts as "can dial" only when it actually has touch input or a phone/tablet user agent.
- Window width is no longer part of the decision, so a narrow desktop window, a split-screen browser, or the preview panel all get the call card.
- Phones and tablets keep the current behavior: tapping a number goes straight to the dialer, no card.
- Safety net: if the card cannot open for any reason, the plain `tel:` link still runs, so nothing is ever a dead click.

## 2. Same call card everywhere

The card component is already mounted once for the whole site, so once the detection above is fixed it appears on the homepage, weekly plan pages, all city pages, service pages, legal pages, the quote modal, and the side water-test form. As part of this work I will click through each of those surfaces on a desktop-sized window and confirm the card opens with the branded styling and all six paths (Call now, FaceTime audio, Call from browser, Text us, Request a callback, Copy number).

## 3. Make sure every lead reaches the CRM

Current state, verified:

- Every form on the site — booking modal, water test tab, city pages, hero CTAs — posts to one endpoint, and that endpoint already saves the lead and then hands it to the CRM. There is no second, unforwarded path.
- The shared secret used to authenticate that handoff is not set on this project right now, so the CRM will reject or ignore the deliveries.
- There are no leads and no delivery records in the database yet, so nothing has been lost so far.

Work to do:

1. Add the shared secret to this project (I will open the secret prompt; the identical value must also be saved in the CRM project).
2. Make the handoff resilient: if the CRM is down or returns an error, retry a couple of times with a short backoff, and always write a delivery record with the status and error text so nothing fails silently.
3. Mark each lead with its sync state (synced, pending, failed) when the handoff finishes.
4. Add a small admin view listing recent leads with sync status, last attempt time, error detail, and a "retry" button for any that failed.
5. Run a live end-to-end test: submit through the booking modal and the water test form, then confirm the lead exists locally and shows as delivered to the CRM.

If the CRM side still rejects signed leads, the delivery record will contain the exact response so we can fix it on the CRM without guessing.

## Technical notes

- `src/components/CallButton.tsx`: replace the width check in `isDesktop()` with touch/user-agent capability detection; keep the `tel:` href as the fallback when interception is skipped.
- `src/lib/crm-lead-forward.server.ts`: add bounded retry, always log to `ss_webhook_deliveries` via `webhook-log.server.ts`, and set `crm_synced_at` / a failure marker on `inspection_requests`.
- New admin route for lead sync status reusing the existing CRM-styled admin shell and the retry server function.
- Secret name: `WEBSITE_WEBHOOK_SECRET` (must match the CRM project exactly).
