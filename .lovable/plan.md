# Slim the website down, move cart + payments to the CRM app

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

### 2. Move cart and payments to the CRM
- Remove the on-site cart drawer, order dialog, subscribe/membership dialogs, and the embedded Stripe checkout from the website.
- Product/pricing pages stay, but every "Buy", "Subscribe", and "Pay" button becomes a handoff link to the CRM app's checkout with the selected item passed in the URL.
- Invoice payment stays in the portal on the CRM side (it already runs there).
- Result: only one app holds payment logic, one set of payment keys, one webhook path. Payments are therefore set up in the CRM project, not here — no payment provider gets enabled on the website.

### 3. Keep the two apps talking
- Leads: the marketing forms keep posting to the CRM lead endpoint (already in place), plus the hardened public endpoint on this site.
- Appointment status webhook from the CRM back to the website stays as-is for customer email/SMS.
- Both apps continue to read and write the same shared database, so nothing needs syncing.

### 4. Speed and cleanup (the "run smooth" part)
- Dropping the CRM tree removes the biggest chunk of JavaScript from the site: charts, editors, PDF/signature tooling, AI dock.
- Remove the "Ask Savvy" chat widget from the website (already requested).
- Recheck the homepage after the cut: hero preload, lazy images, fonts, and route-level code splitting.
- Re-run a speed check and report before/after numbers.

## Technical notes

- Set `VITE_CRM_URL=https://savvyswim.app` so `appUrl`/`portalUrl`/`staffLoginUrl` resolve externally; add small redirect routes for the old in-app paths.
- Files removed: `src/crm/**`, `src/routes/_crm/**`, `src/routes/admin/**`, `src/routes/crm/**`, `src/routes/portal*`, `src/pages/Admin*.tsx`, `src/pages/Portal*.tsx`, `src/pages/CrmApp.tsx`, plus cart/checkout components (`CartDrawer`, `OrderDialog`, `SubscribeDialog`, `MembershipDialog`, `StripeEmbeddedCheckout`, `useCart`) and their Supabase edge-function callers where the website was the only caller.
- Server functions kept on the website: lead intake/validation/rate limiting, inspection notifications, appointment-status webhook, health/canary endpoints.
- Server functions removed: CRM-only ones (savvy AI, webhook tester, finance, contracts, test credentials).
- Anything shared by both apps stays in the database, not in code.

## Confirm before I start

Deleting the CRM from this project is not reversible from the website side — the CRM app must already have those screens live at savvyswim.app.
