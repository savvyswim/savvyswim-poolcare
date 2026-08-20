# Rollback checklist

**Roll back to the last version you know worked**

1. Confirm the failure: /, /api/public/health, /schedule, /services, /weekly-pool-service, error page (unknown URL).
2. Re-run `bun run test:smoke` against the published URL to rule out a transient blip.
3. No healthy ping is on record yet, so restore the most recent version you know rendered pages, then re-run the smoke test.
4. The break first appeared at Aug 20, 2026, 1:20 PM (boot id unknown) — review the edits made right before it.
5. After restoring, re-run `BASE_URL=https://savvyswimservices.com bun run test:smoke` and confirm 200s.
6. Then fix forward on the broken change and publish again.

_Generated 2026-08-20T13:20:55.662Z_