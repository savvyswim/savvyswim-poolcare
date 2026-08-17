# Consolidate on savvyswimservices.com

Right now the site answers on four domains and the SEO signals disagree with each other: `public/sitemap.xml` advertises `savvyswim.com`, while the canonical tags and structured data say `savvyswimservices.com`. No verified Search Console property covers the published URL either, so Google has no clean picture of the site and search traffic is effectively zero (125 visitors last month, all but two Direct).

This makes `savvyswimservices.com` the single home for the site.

## What changes

- Every sitemap URL switches from `savvyswim.com` to `https://savvyswimservices.com`.
- The sitemap gets the pages that are missing today: all live city pages, `/weekly-pool-service`, `/pool-cleaning-plano`, `/free-inspection`, `/privacy-policy`, `/terms-and-conditions`.
- Canonical and `og:url` tags are checked on every public page so each one points at its own address on the chosen domain.
- Internal links, JSON-LD and email/footer references all use the same domain, so nothing sends visitors or crawlers to a second version of the site.
- After the changes are published: verify `https://savvyswimservices.com/` in Search Console and submit the sitemap once.

## Redirects (needs your action)

The other three domains — `savvyswim.com`, `www.savvyswim.com`, `www.savvyswimservices.com` — should 301 to the primary. In Project Settings → Domains, set `savvyswimservices.com` as Primary; the others then redirect to it automatically. I can't flip that switch for you, so I'll flag it when the code work is done.

Nothing about your phone number, booking modal, lead flow or CRM handoff changes.

## Technical notes

- `public/sitemap.xml`: rewrite all `<loc>` values to the primary domain and add the missing routes; no `lastmod` values invented.
- `src/lib/structured-data.ts` (`SITE_URL`), `src/components/Seo.tsx` (`SITE_URL`) and `src/routes/__root.tsx` already use `savvyswimservices.com` — audited, not changed unless a mismatch shows up.
- Audit each route file's `head()` for a self-referencing canonical, adding one where a page has none.
- Search Console verification uses the existing connection; the property will be the URL-prefix `https://savvyswimservices.com/`.
