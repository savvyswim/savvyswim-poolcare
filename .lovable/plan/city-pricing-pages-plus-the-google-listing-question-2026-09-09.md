# City pricing pages, plus the Google listing question

## The Google listing first

I cannot submit or verify the listing for you. Google only accepts a listing
from the Google account that will own it, and verification is a postcard, phone,
email or video step tied to that account. No tool or API can do it on your
behalf, and I cannot confirm it in local search until Google approves it.

What already exists: a complete step-by-step guide with the exact name, phone,
hours, categories, service areas and description to paste, all matched to the
live site. Nothing in it needs changing. One correction to note: we are a
service-area business with no public pool addresses, so the address stays
hidden. When the listing is live, send me the profile link and I will connect it
to the site's business markup.

## Pricing pages for each service area

New page per city at `/{city}/pricing`, for all eleven cities plus Frisco.

Each page shows:

1. The city's real starting price, the figure already on the site.
2. What that price includes, week by week: chemistry testing, skim, brush,
   vacuum, baskets, filter pressure check, chemicals, photo report.
3. Three plan tiers with what separates them, priced from the city's starting
   price. Swim Club shown as the $19.99/mo add-on stacked on top.
4. A short, honest "what changes your price" list: pool size, spa, water
   features, salt system, tree cover, current condition.
5. Free inspection call to action, opening the existing on-site quote form.

### One thing I need from you

The site currently publishes only a starting price per city. For the two higher
tiers I need your real numbers. Until you give them, those tiers will read
"quoted at your walkthrough" rather than a made-up figure. Send the figures and
I will drop them in.

## Technical notes

- Extend `ServiceArea` in `src/lib/serviceAreas.ts` with an optional `pricing`
  block: tier names, price or null, and the included/excluded lines. Cities
  without data fall back to the shared default derived from `startingPrice`.
- New route `src/routes/$city.pricing.tsx` mirroring the loader and `notFound()`
  behaviour of `src/routes/$city.tsx`, with its own `head()`: unique title,
  description, canonical `https://savvyswim.com/{city}/pricing`, og and twitter
  tags, plus `Service` and `FAQPage` JSON-LD carrying `offers` with the starting
  price and `priceCurrency: "USD"`.
- Frisco keeps its dedicated URL shape: `src/routes/pool-cleaning-frisco-tx.pricing`
  is not valid, so Frisco gets `src/routes/frisco.pricing.tsx` canonicalised to
  itself and linked from the Frisco page.
- Shared presentational component `src/components/CityPricing.tsx`, Riviera
  tokens, square corners, no em dash.
- Link the pricing page from each city landing page and from the footer city
  list; add every new URL to `scripts/generate-sitemap.ts` output.
- Verify with `bunx tsgo --noEmit`, `bunx vitest run`, and a preview load of two
  city pricing pages.
