# Production Keyword Scan: Results

I scanned the live site, the source code, and the database for PDR / hail / auto / insurance-claim wording.

## Live website — clean

Every page in the sitemap plus key extra routes (home, services, weekly-pool-service, schedule, quote, thank-you, privacy, terms, all 13 city pages, robots.txt, sitemap.xml) was fetched from production and searched for: perfect hammer, hail, paintless, PDR, dent repair, insurance claim, adjuster, deductible, VIN, vehicle, auto body, collision.

**Zero matches.** The only "dent" hits were inside ordinary words on the legal pages ("confidentiality", "residents", "incidental") — legitimate legal copy, not auto wording.

## Database — clean

No table or column in the live database contains vehicle, VIN, hail, dent, PDR, or insurance naming. (The only hit was `ss_rate_limits.identifier`, which is unrelated.)

## Source code — one leftover, history only

Two archived SQL migration files still contain historical `vehicle_make / vehicle_model / vehicle_year / vehicle_vin` text:

- `supabase/migrations/20260808200453_...sql` — adds those columns
- `supabase/migrations/20260808202504_...sql` — drops them again

These are already-applied history files. They are never shipped to the browser, never indexed, and the columns no longer exist in the database. They are invisible to visitors and to Google.

## Optional cleanup (needs your approval)

If you want a literal zero-match repo, I can rewrite those two archived files so the wording reads `pool_detail_*` instead of `vehicle_*`. Notes:

- Editing applied migrations does not re-run them and does not touch the live database.
- The pair currently cancels out (added, then dropped), so renaming both together stays consistent.
- Risk is low but non-zero if the project is ever rebuilt from migrations on a fresh database; the two files must be edited as a matched pair.

If you approve, I will make only that change and re-run the full scan to confirm zero matches everywhere.
