# Verify savvyswim.com in Search Console without touching DNS

The screen you're on is Google's **domain property** flow, which only accepts a DNS TXT record. You don't need that route. A **URL-prefix property** verifies through a meta tag on the site itself, which I can place and verify for you end to end — same reports, same sitemap coverage, no registrar work.

## What happens

1. Request a fresh meta-tag verification token from Search Console for `https://savvyswim.com/` (and the same again for `https://www.savvyswim.com/` and the two savvyswimservices.com hosts, so every live domain has its own verified property).
2. Add each `google-site-verification` tag to the site's `<head>` in `src/routes/__root.tsx`, keeping the existing tag already there.
3. You publish once so the tags go live on the custom domains.
4. I call Google's verify step, add each verified property to your Search Console list, and submit `sitemap.xml` against the primary one.
5. I report back which properties came back verified and the sitemap status.

## On the screen you're looking at

You can leave that domain property pending or press "Remove property" — nothing there is needed once the URL-prefix properties are verified. If you'd rather keep the domain property too, the TXT record can be added later under Project Settings > Domains > Configure > Manage DNS records, since the domain was bought through Lovable.

## Technical notes

- Verification runs through the Google Search Console connector gateway: `POST /siteVerification/v1/token` (type `SITE`, method `META`) → tag in `__root.tsx` head → `POST /siteVerification/v1/webResource?verificationMethod=META` → `PUT /webmasters/v3/sites/{encoded}`.
- Only `src/routes/__root.tsx` changes; existing verification tags stay in place.
- Sitemap submission uses the exact `siteUrl` returned by a fresh `GET /webmasters/v3/sites` after the add, not a constructed one.
- A publish is required between steps 2 and 4 — Google fetches the live domain, not the preview.
