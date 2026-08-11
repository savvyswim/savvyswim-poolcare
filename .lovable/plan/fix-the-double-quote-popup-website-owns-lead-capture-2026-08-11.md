# Fix the double quote popup — website owns lead capture

## What's happening

The CRM embed script (`savvyswim.app/embed/savvy-leads.js`, injected after cookie consent) listens to every click on the page. Any button whose label matches "Request a quote", "Get my quote", "Claim the summer offer", "Join in 60 seconds", etc. is intercepted (`preventDefault`) and it opens its own generic grey/white overlay on top of whatever the site is already showing. That is the small "REQUEST A QUOTE" box stacked over the branded booking panel in your screenshot — two lead forms fighting for the same click.

## The fix

The website keeps the lead capture, in Savvy Swim styling. The CRM link stays a link — used only to send people to the app (portal, staff login, Swim Club checkout).

1. **Remove the embed script.** Drop the `savvy-leads.js` injection from the consent flow so nothing hijacks site buttons or draws a second modal. Consent banner stays (it still gates analytics), just with nothing left to inject.
2. **One branded quote modal, built on site.** A single `QuoteModal` component in the Riviera style (burgundy #8E1F2C, cream #F4EFE3, Anton/Oswald, square corners) with: name, phone, email, pool address, message, plus the hidden honeypot and fill-timer the endpoint already expects. Accessible dialog — labelled, Escape closes, focus trapped and returned, 44px targets.
3. **Wire every lead CTA to it.** Homepage, Services, Weekly Pool Service and all city pages: quote / free inspection / summer offer buttons open the modal instead of redirecting off-site. Each passes its own source tag so the CRM knows which page and campaign produced the lead.
4. **Submit to the site's own hardened endpoint.** `POST /api/public/leads` already validates with Zod, rate limits per IP and email, checks the honeypot, enforces the minimum fill time and verifies Turnstile — it writes the lead where the CRM reads it. Success shows a branded confirmation with the phone number; failure shows a retry message, never a dead end.
5. **Links stay links.** Customer login, staff login and the Swim Club Stripe checkout keep redirecting to `savvyswim.app` untouched.

## Technical notes

- `src/lib/consent.ts`: delete `LEAD_EMBED_SRC` / `loadLeadEmbed` and its call sites (`ConsentBanner.tsx`, root route).
- New `src/components/QuoteModal.tsx` + a small `useQuoteModal` context provider mounted in `src/routes/__root.tsx` so any page can open it.
- Replace `leadUrl(...)` / `goToLead(...)` CTA handlers in `src/pages/Index.tsx`, `Services.tsx`, `WeeklyPoolService.tsx`, `CityLanding.tsx` with `openQuote({ source })`; keep `site-analytics` tracking on open and on submit.
- Legacy redirect routes (`/book`, `/request-inspection`, `/free-inspection`) can point back at the homepage with the modal auto-opened via `?quote=1` instead of leaving the domain.
- No backend changes; the existing leads endpoint and its rate limits are reused as-is.
