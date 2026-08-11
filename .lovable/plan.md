# Every action button hands off: leads to the CRM, Swim Club to Stripe

## What changes

Two handoffs, applied everywhere on the marketing site.

```text
Lead buttons  (Book, Request free inspection, city CTAs)  ->  savvyswim.app/book
Swim Club buttons ($19.99/mo)                             ->  Stripe payment link
```

### 1. Lead buttons go to the CRM

Today three different things happen depending on the button: some open the local
`BookingDialog`, some link to `/request-inspection`, and the form saves here and
forwards to the CRM afterwards. All of it becomes a single outbound link to the
CRM booking form, with campaign attribution (utm/gclid/fbclid), the page it came
from, and a `source` tag attached to the URL.

Buttons converted, on every page:
- Home: hero "Book free inspection", section CTAs, footer CTA
- Services: each plan's booking button and the bottom CTA
- Weekly pool service hub: both CTAs
- City pages (all 13) and the Frisco page: hero and bottom CTAs

Old URLs stay alive: `/book`, `/request-inspection` and `/free-inspection`
become instant redirects to the CRM booking page, so bookmarks, the sitemap and
any live ads keep working. The website's own inspection form and booking dialog
come out of the bundle, which also makes the site lighter on mobile.

### 2. Swim Club buys through Stripe

The $19.99/mo membership buttons open the Stripe payment link directly:

- "Join in 60 seconds" (the floating Swim Club prompt)
- "Claim summer offer"
- The referral / membership section button

Each carries a tag so you can tell in Stripe which button produced the sale.

Note on the link you sent: `buy.stripe.com/test_...` is a **test-mode** link — it
will not take real money. It goes in as the default so you can click through the
flow today; when you have the live link from the CRM, it swaps in without a code
change.

### 3. What stays on the website

Pricing, plan descriptions, city pages, SEO content and schema all stay. Only
the transactional steps (filling the lead form, paying) move to the app.

### 4. Consent + conversion analytics

A small event log so you can see how consent affects conversions:

- Banner shown, accepted, declined, reopened from the footer "Cookie settings"
- Lead button clicked (which page, which button, consent state at that moment)
- Swim Club button clicked (which button, consent state)

Everything is stored first-party in your own database — no cookies needed for
the counting itself, so declined visitors are still counted anonymously (no
identifiers, just page, button, consent state, timestamp).

A dashboard section in the CRM (Marketing) shows: banner accept rate, lead
clicks split by accepted vs declined vs undecided, and click-to-submission rate
per page, so you can tell whether the banner is costing you leads.

### 5. Bot and spam protection

Since the form itself moves to the app, the protection goes where submissions
actually arrive on this site: `POST /api/public/leads`, which the CRM embed and
any stray form still hit. On top of the existing Zod validation, honeypot and
IP/email rate limits, it gets:

- A timing check (submissions faster than a human can type are rejected)
- Duplicate collapse on the same email/phone within a short window
- Cloudflare Turnstile, invisible by default and only challenging suspicious
  traffic, so mobile users normally see nothing and never solve a puzzle
- Blocked attempts logged so you can see spam volume rather than guess

Turnstile needs a site key and secret from Cloudflare (free) — I will ask for
them when it is time to wire it up. Until they exist, the other checks run and
Turnstile stays off.


## Technical notes

- `src/lib/app-links.ts` gains `leadUrl(source, params)` and
  `swimClubCheckoutUrl(source)`; both build on the existing `buildCrmLink`
  attribution logic. The Stripe URL is read from `VITE_SWIM_CLUB_STRIPE_URL`
  with the test link as fallback, so switching to live is an env change.
- Removed from the website bundle: `BookingDialog`, `RequestInspection`,
  `AddressAutocomplete`/`AddressMapPreview` usage on those forms.
- Kept: `POST /api/public/leads` (hardened endpoint with validation and rate
  limiting) and `forwardLeadToCrm`, so anything still posting here is captured
  and pushed to the CRM.
- Redirect routes use `beforeLoad` with a 301 to the CRM booking URL.
- Sitemap entries for `/book`, `/free-inspection`, `/request-inspection` are
  dropped since they no longer render content.

## Confirm

Removing the on-site inspection form means every lead is captured on
savvyswim.app — that form must be live there before this ships.
