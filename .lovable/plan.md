# Google Business listing + matching business info on the site

## What I checked

- Your site already publishes local-business details for search engines (name, phone `817-663-7665`, email, hours Mon–Fri 8–6 / Sat 9–2, and the full city list) as a service-area business with no street address. That matches your "service area only" choice.
- I searched Google's public business data for "Savvy Swim" through the Maps connection and got **no result**, and the share link you sent (`share.google/OodZFpwJPymDDl7ay`) does not open to a business page — it bounces to a generic Google page. So I could not confirm the live listing or read its real details.
- The site's "leave a Google review" link is currently `https://g.page/r/savvyswim/review`, which looks like a placeholder rather than a real profile link.

I will not invent business facts. Two things must come from you before the Google side can be finished.

## What I need from you

1. The full Google Maps link to your listing — open the profile on Google Maps in a browser and copy the long address bar URL (not the short share link).
2. Confirmation of the exact hours and phone Google shows, so the website and Google say the same thing.
3. Your real review link, copied from the Google Business dashboard ("Ask for reviews" → copy link).

## Google Business Profile — the steps I'll walk you through

Google requires the owner to be signed in, so I guide and check; you click.

1. Sign in at business.google.com with the account that owns Savvy Swim and open the profile.
2. Business name: `Savvy Swim` — exactly as on the site, no city or keywords appended.
3. Location: turn the street address off, keep "I deliver goods and services to my customers".
4. Service areas: add the same cities the site lists — Plano, Frisco, McKinney, Allen, Prosper, Richardson, Garland, Dallas, Highland Park, University Park, Irving, Rockwall (and any others on the map).
5. Category: primary "Pool cleaning service"; add "Swimming pool repair service" as secondary.
6. Contact: phone `(817) 663-7665`, website `https://savvyswimservices.com`.
7. Hours: Mon–Fri 8:00 AM–6:00 PM, Sat 9:00 AM–2:00 PM, Sun closed — matching the site.
8. Services list: weekly service, filter cleans, equipment repair, green-to-clean, with the same starting prices the site shows.
9. Photos: add real job photos from the site's work gallery.
10. After you save, I re-check the public listing through the Maps connection and confirm Google shows the same name, phone, hours and areas as the site — and flag anything that disagrees.

## Website changes

1. Add a visible business-info block next to the service-area map on the homepage: phone, hours, email, "service area only — we come to you", the city list, and a "View us on Google" link once you send the real profile URL.
2. Keep that block reading from the existing single sources for phone, hours and cities, so Google and the site can never drift apart.
3. Update the review link to the real one you copy from the dashboard.
4. Add the profile URL to the site's local-business search data so Google can tie the listing and website together.

## Technical notes

- Business info block: new component rendered near the service-area map in `src/routes/index.tsx`, sourcing from `src/lib/contact-info.ts` and `src/lib/service-locations.ts`.
- Hours currently live inline in `src/lib/structured-data.ts`; move them to one exported constant reused by the schema and the new block.
- Add the confirmed profile URL to `sameAs` in `localBusinessSchema()`, and replace `GOOGLE_REVIEW_URL` in `src/lib/contact-info.ts`.
- Verification after the fact uses the Google Maps connection's place lookup, not a browser step.
