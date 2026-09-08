# Switch the site to savvyswim.com and strengthen local search

## What's already true

- savvyswim.com is connected, live and set as the main address. www.savvyswim.com, savvyswimservices.com and www.savvyswimservices.com all forward to it. Nothing needs building or reconnecting.
- The site-health checker already points at savvyswim.com.
- The site's own text, sitemap and page addresses still say savvyswimservices.com, which is why Google is indexing the forwarding address instead of the real one.

## 1. Make savvyswim.com the address Google sees

- Update the sitemap generator and the published sitemap file so every page URL is `https://savvyswim.com/...`.
- Update robots.txt to point at `https://savvyswim.com/sitemap.xml`.
- Update the page-address (canonical) and social-preview values across the site: home, services, weekly pool service, schedule, all city pages, Frisco/Plano variants, privacy, terms, leave-a-review, plus the shared business data used for search results.
- Update the contact card file, the smoke/health scripts and the ops notes that still reference the old address.
- Leave email untouched: `hi@savvyswim.com` for contact, and the existing `notify@savvyswimservices.com` sending address stays as-is so confirmations keep delivering.

## 2. Google Business listing

Your listing is verified and service-area only, so there is no street address to submit and I can't publish changes into Google for you (there's no owner connection to your profile from here). What I will do:

- Resolve your listing from the link you shared and pull its public details, then record them on the site: profile link, and the review link if it can be resolved.
- Add the confirmed profile link to the site's business data so search engines connect the site and the listing.
- Give you a short checklist for the parts only you can save inside Google: service-area cities, categories, phone, website set to savvyswim.com, hours (Mon-Fri 8-6, Sat 9-2, Sunday closed with the Swim Club emergency line noted), services and photos.
- After you save, I can re-check the listing's public details and confirm the site matches.

## 3. Local search text

- Homepage: a short, honest section naming the Dallas-Fort Worth service area, the cities covered, weekly service and the Sunday emergency line for Swim Club members.
- City pages: per-city wording that mentions the city and its neighbours, with no invented landmarks, addresses or claims.
- Weekly pool service page: a service-area paragraph tying the weekly plan to the cities covered.
- All wording uses only details you've confirmed: service-area business, phone 817-663-7665, hi@savvyswim.com, hours above, Swim Club at $19.99/mo on top of the base price.

## 4. Checks

- Type check and the test suite.
- Load the homepage and confirm savvyswim.com serves it directly with no forward.
- Confirm the sitemap and robots.txt return the new addresses.

## Technical notes

- Files: `scripts/generate-sitemap.ts`, `public/sitemap.xml`, `public/robots.txt`, `public/savvy-swim.vcf`, `src/components/Seo.tsx`, `src/lib/structured-data.ts` (`SITE_URL`), `src/lib/contact-info.ts` (`GOOGLE_PROFILE_URL`), `src/routes/__root.tsx`, `src/routes/$city.tsx`, `plano.tsx`, `frisco.tsx`, `pool-cleaning-*.tsx`, `weekly-pool-service.tsx`, `privacy*.tsx`, `terms*.tsx`, `src/pages/Privacy.tsx`, `src/pages/Terms.tsx`, `src/pages/PoolCleaningFrisco.tsx`, `scripts/smoke-test.ts`, `src/__tests__/smoke-routes.test.ts`, `src/lib/rollback-checklist.ts`, `docs/*`.
- Listing lookup uses the Google Maps connector (Places text search / place details) read-only; the knowledge-graph id from your share link is `/g/11zh9g57x4`.
- Copy changes stay in existing page components; no schema or backend changes.
