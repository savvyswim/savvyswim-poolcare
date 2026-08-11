# Fix the Swim Club 404, keep our quote form, re-connect the CRM lead mirror

## 1. Swim Club 404 (the screenshot)

The "Swim Club" and "Contact" links in the header of the Services, Weekly Pool Service, Frisco and city pages are written as `/#membership` / `/#contact` in a single path field. The router reads that whole string as a page address, finds nothing, and shows the 404 screen.

Fix: split the hash out (`to="/" hash="membership"`) in
`src/pages/Services.tsx`, `src/pages/WeeklyPoolService.tsx`,
`src/pages/PoolCleaningFrisco.tsx`, `src/pages/CityLanding.tsx`, and sweep for any other instance.

The Stripe Swim Club checkout link itself is healthy — it loads fine when opened directly, so it stays as is.

## 2. Keep the quote experience we already have

No change to how leads are captured: the branded on-site quote modal (`src/components/QuoteModal.tsx`) stays the single form behind every quote / booking / inspection CTA, still posting to our hardened `/api/public/leads`. This is the version that replaced the grey stacked popup.

## 3. Re-connect the CRM lead mirror

The CRM now maps unnamed fields and accepts trusted browser origins, so the embed can come back:

- Add `{ src: "https://savvyswim.app/embed/savvy-leads.js", defer: true }` to the head `scripts` array in `src/routes/__root.tsx`, alongside the existing JSON-LD entry.
- Tag the quote form with `data-savvy-cta="free_pool_visit"` on the `<form>` in `QuoteModal.tsx`.
- Tag the pricing / "Request a quote" CTAs with `data-savvy-cta="request_quote"` and the homepage "Get my quote" button with `data-savvy-cta="get_my_quote"`.

Note: the site no longer has `BookingDialog.tsx` or `RequestInspection.tsx` — both were consolidated into the one quote modal, so the tagging lands there instead.

### Guardrail

The last time this script was on the site it intercepted CTA clicks and injected its own grey form on top of ours. I'll load it only after cookie consent (same gate as before) and verify in the preview that clicking every CTA opens exactly one branded modal, that submitting still hits our endpoint, and that no second popup appears. If the script still hijacks clicks, I'll stop and report rather than leave the double-modal bug live.

## Verification

Preview pass across home, Services, Weekly Pool Service, Frisco and a city page: Swim Club and Contact links scroll instead of 404, "Join in 60 seconds" opens the $19.99/mo checkout, and one quote submission shows a single branded modal plus a successful post.
