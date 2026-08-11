# Website = marketing only; every action button hands off to the CRM app

## Where things stand

Right now this one project ships both halves: the marketing site and the whole CRM. `src/routes/_crm/admin/crm/` alone holds 40+ CRM screens, plus `/portal`, `/admin/*`, the shop cart, and Stripe checkout components. `src/lib/app-links.ts` already has the handoff switch (`VITE_CRM_URL`), but it is unset, so everything still renders locally. The CRM now lives as its own app at savvyswim.app.

## Goal

```text
savvyswim.com   -> marketing only: pages, SEO, lead capture, "Book" and "Login" buttons
savvyswim.app   -> CRM + customer portal + cart/checkout + all payments
                    (both share the same backend/database)
```

## What gets done

### 1. Remove the CRM from the website bundle
- Delete the CRM route tree (`/_crm/**`, `/admin/**`, `/crm/**`), the customer portal routes, and the CRM page/component/lib folders they pull in.
- Anything that linked to them now links out to savvyswim.app through `app-links.ts` with `VITE_CRM_URL=https://savvyswim.app`, so "Customer login", "Staff login", portal, and invoice links all hand off.
- Keep legacy paths working: `/portal`, `/admin/crm`, `/crm` become instant redirects to the matching page on savvyswim.app.

### 2. Every action button hands off to savvyswim.app
- Buy, Subscribe, Join Swim Club, Pay invoice, Book, My account, Login — all become handoff links into the matching screen on savvyswim.app, carrying the selected plan/product and attribution in the URL.
- Cart, checkout dialogs and Stripe components come out of the website bundle. Billing, orders, subscriptions and customer records are tracked in one place: the CRM.
- Product and pricing pages stay on savvyswim.com as marketing content, so the shop is still browsable here — the purchase itself completes in the app.
- Payments therefore get set up in the CRM project, not this one: one set of payment keys, one webhook path, one source of truth.

### 3. All leads go to the CRM
- Every lead source on the site — free inspection form, booking dialog, city landing pages, contact CTAs — posts to the CRM lead endpoint at savvyswim.app, with UTM/attribution attached.
- The hardened public lead endpoint on this site keeps validation, rate limiting and duplicate collapse, then forwards to the CRM so nothing is lost if a form posts here directly.
- Appointment status webhook from the CRM back to the website stays as-is for customer email/SMS.
- Both apps continue to read and write the same shared database, so nothing needs syncing.

### 4. Speed and cleanup (the "run smooth" part)
- Dropping the CRM tree removes the biggest chunk of JavaScript from the site: charts, editors, PDF/signature tooling, AI dock.
- Remove the "Ask Savvy" chat widget from the website (already requested).
- Recheck the homepage after the cut: hero preload, lazy images, fonts, and route-level code splitting.
- Re-run a speed check and report before/after numbers.

## Technical notes

- Set `VITE_CRM_URL=https://savvyswim.app` so `appUrl`/`portalUrl`/`staffLoginUrl` resolve externally; add small redirect routes for the old in-app paths.
- Files removed: `src/crm/**`, `src/routes/_crm/**`, `src/routes/admin/**`, `src/routes/crm/**`, `src/routes/portal*`, `src/pages/Admin*.tsx`, `src/pages/Portal*.tsx`, `src/pages/CrmApp.tsx`.
- Files kept: shop/cart/checkout (`useCart`, `CartDrawer`, `OrderDialog`, `SubscribeDialog`, `MembershipDialog`, `StripeEmbeddedCheckout`, `/checkout/return`) and their checkout/webhook backends.
- Payments: enable Stripe on this project, then create the products/prices (service plans, Swim Club membership, store items) with tax codes, and wire the checkout + webhook handler.
- Server functions kept: lead intake/validation/rate limiting, lead forwarding to the CRM, inspection notifications, appointment-status webhook, health/canary endpoints, checkout and payment webhooks.
- Server functions removed: CRM-only ones (savvy AI, webhook tester, finance, contracts, test credentials).
- Anything shared by both apps stays in the database, not in code.

## Confirm before I start

Deleting the CRM screens from this project is not reversible from the website side — those screens must already be live at savvyswim.app.

