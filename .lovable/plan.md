# See leads city by city

Goal: for every booking or water-test request, know which page it came from — home, Frisco, Plano, Weekly Service, Services, or any of the generic city pages — and see the counts side by side.

## What already happens today

Every lead saved from the site already records the page it was submitted from (`/`, `/pool-cleaning-frisco-tx`, `/plano`, etc.), a CTA source label, the referrer, UTM tags and a session id. So most of the raw signal is there — two things are missing.

## Gap 1 — all generic city pages report the same source

The Frisco and Plano pages tag their leads "frisco" and "plano", but every other city page (Prosper, Irving, Rockwall, McKinney, Allen, Garland…) tags its leads with the single label "city". So a lead from Prosper and a lead from Rockwall look identical in the source column.

Fix: each city page tags its leads with its own city, and the shared water-test side tab also carries the page it was opened from. Home, Services and Weekly Service keep their current labels.

## Gap 2 — nowhere to look at it

Fix: a new internal page, **Lead Sources**, at `/admin/lead-sources` (not indexed by search engines, same burgundy/cream Riviera styling as the existing Lead Sync console).

It shows, for a chosen date range (last 7 / 30 / 90 days / all time):

- **By city** — a ranked table: city, total leads, booking vs water test split, share of total, first and most recent lead. Cities are derived from the page the lead came from, so it stays correct even for pages added later.
- **By page** — same numbers grouped by exact page path, so `/plano` and `/pool-cleaning-plano` show separately when both are live.
- **By CTA** — which button produced the lead (hero, final CTA, plan card, water-test tab).
- **By channel** — Google / direct / referral plus UTM campaign, for the leads that carry it.
- A small summary strip up top: total leads in range, leads this week, and the top city.
- Each row expands to the actual leads (name, phone, date, status) so you can jump from a number to the people behind it.

Backfill note: leads already in the system are grouped by their stored page path, so history is included — but leads captured before this change from the generic city pages will still read as "city" in the CTA column; their page path still identifies the city correctly, and the by-city table uses the page path.

## Technical notes

- Client: add a `city` argument to the city landing CTA (`src/pages/CityLanding.tsx` → `goToLead("city_" + slug)`), and pass the current path into the water-test tab source in `src/lib/site-analytics.ts`.
- No schema change needed. `inspection_requests` already stores `source`, `page_path`, `landing_page`, `referrer`, `utm_*`, `lead_type` and `created_at`.
- Data access: a new authenticated server function in `src/lib/lead-sources.functions.ts` using `requireSupabaseAuth`, aggregating `inspection_requests` server-side; city derivation is a small path→city map plus a slug fallback, shared with the route list.
- UI: `src/routes/admin/lead-sources.tsx`, TanStack Query + `useServerFn`, mirroring the structure and styling of `src/routes/admin/lead-sync.tsx`, `robots: noindex, nofollow`.
- Add a link between the two admin consoles so they're reachable from each other.
