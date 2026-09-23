# Local listings and a public local SEO page

## What I can and cannot do for the listings

Google Business Profile, Bing Places, Apple Business Connect, Yelp and Nextdoor all
require the owner to sign in and pass verification (postcard, phone or video). I
cannot create or submit those listings for you, and no tool here can. Savvy Swim is
also a service-area business, so there is no street address to submit, only the
twelve cities we run routes in.

What already exists: the internal sheet at `/admin/listing` holds the exact name,
phone, hours, categories, services, areas and description to paste in, with copy
buttons. I will keep that as the submission source and extend it so it covers
every directory in one pass, with a simple checklist you can tick off.

## 1. New public local SEO page at /service-areas

One page a search engine can read end to end, linked from the footer and from the
homepage service-area section:

- Who we are and where we run: Dallas-Fort Worth, service-area business, no walk-in
  shop.
- Full service list with what each one includes: weekly pool service, green pool
  recovery, equipment repair, filter cleans and hard-water scale care, free water
  testing, Swim Club membership.
- Service hours, from the same hours file the rest of the site uses.
- Contact block: phone, email, request a free inspection button, save-our-contact card.
- Every city we cover: the twelve with their own pages linked by name, plus the
  wider DFW list as plain text.
- Links out to each city page and each city pricing page.

## 2. Structured data on that page

LocalBusiness markup pointing at the same shared business record the homepage uses,
with the hours, the service catalogue and the service areas, so search engines can
match the page to the Google listing once it is verified.

## 3. Wiring

- Footer link "Service areas and hours".
- Added to the sitemap so it is picked up on the next crawl.
- Its own page title, description and social preview.

## 4. Submission checklist for you

The `/admin/listing` page gains a short step list per directory with the sign-up
link and what to choose, so you can work through Google, Bing, Apple, Yelp and
Nextdoor in order. Once Google verification comes back, send me the public profile
link and I will connect it to the site's business record so the two are linked.

## Technical notes

- New route `src/routes/service-areas.tsx` plus `src/pages/ServiceAreas.tsx`.
- Reads `src/lib/business-hours.ts`, `src/lib/service-locations.ts`,
  `src/lib/contact-info.ts`, `src/lib/structured-data.ts` (`SERVICE_CATALOG`,
  `localBusinessSchema`, `serviceSchema`) and `src/lib/city-pricing.ts`. No new
  constants, no duplicated facts.
- Sitemap entry via `scripts/generate-sitemap.ts` and `public/sitemap.xml`.
- No backend or schema changes.
