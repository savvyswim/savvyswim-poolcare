## Technical notes

- New `src/pages/AdOffer.tsx` and route `src/routes/offer.tsx`. Route validates optional search params (`utm_source`, `utm_medium`, `utm_campaign`, `ref`) with the same short sanitizer pattern used in `src/routes/book.tsx`, and passes them to the page.
- Every call to action links to `/survey` carrying those params through, so `src/pages/Survey.tsx` keeps prefixing the lead `source` with the campaign code. No change to the survey, the leads endpoint, or the database.
- Standalone layout: the page renders its own compact header (logo plus phone) instead of `SiteChrome` navigation, reusing existing pieces (`PHONE_HREF`, `BUSINESS_HOURS`, `SERVICE_LOCATIONS`) and the current brand styling, square corners, burgundy and cream.
- `head()` sets its own title, description, `og:title`, `og:description`, `og:type`, `twitter:card`, plus `robots: noindex, follow`. No canonical to itself, no sitemap entry in `scripts/generate-sitemap.ts`.
- Suppress the floating water test tab on `/offer` in `src/routes/__root.tsx`, matching how `/survey` is handled, and keep the offer popup off this route too.
- Page view tracking already fires site wide, so the ads report picks up `/offer` traffic with no extra work.
- Copy uses only claims already on the site: free first inspection, full water test, system check, written report, free first filter clean on switching. No new prices or guarantees.
