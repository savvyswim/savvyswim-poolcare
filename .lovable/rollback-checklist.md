# Rollback checklist

**Roll back to the last version you know worked**

1. Confirm the failure: /admin/crm/deploy-health, /admin/crm/deploy-health [critical].
2. Re-run `bun run test:smoke` against the published URL to rule out a transient blip.
3. No healthy ping is on record yet, so restore the most recent version you know rendered pages, then re-run the smoke test.
4. The break first appeared at Aug 6, 2026, 10:39 PM (boot id unknown) — review the edits made right before it.
5. After restoring, re-run `BASE_URL=https://savvyswim.com bun run test:smoke` and confirm 200s.
6. Then fix forward on the broken change and publish again.

_Generated 2026-08-06T22:39:36.314Z_