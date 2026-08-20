# Stop the canary FAILED emails

## What's actually wrong

The canary is right — those pages really do return 404 on the live site — but the code is not broken. I checked live production just now:

- `/` -> 200, `/portal` -> 200
- `/app` -> 404, `/admin/crm` -> 404, `/admin/crm/deploy-health` -> 404, `/admin/canary` -> 404

All of those pages exist in the current project source (the "CRM has moved" pages and the canary dashboard). They 404 only because **the published site is older than those changes**. The canary and its route list are generated from the app's own routes, so the monitor already knows about pages the live deployment has never received. Result: every scheduled run pages you by email/SMS.

## The fix

1. Publish the project so production serves the current routes.
2. Re-check the failing paths on `savvyswimservices.com` and confirm they return a real page instead of 404.
3. Trigger one canary run against production and confirm it reports OK (0 failing).

## If anything still fails after publishing

Only then is it a code issue. In that case I'd look at whether the still-failing path is one the site genuinely no longer serves, and drop it from the monitored list at its source (route manifest / exclusion rules in the canary route config) rather than leaving a permanently red check.

## Technical notes

- Monitored routes are derived from `src/lib/route-manifest.gen.ts` via `src/lib/canary-routes.ts`; `/app`, `/admin/crm`, `/admin/crm/$` and `/admin/canary` are all present there and backed by real route files.
- No source changes are expected for this fix — the discrepancy is deploy state, not code.
