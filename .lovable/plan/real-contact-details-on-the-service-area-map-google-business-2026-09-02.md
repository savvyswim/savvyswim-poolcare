# Real contact details on the service-area map + Google Business setup

You confirmed Savvy Swim is a **service-area business**: no public street address, one phone number and one email for every city.

## What changes on the site

**Service-area map block**
- Replace the hard-coded phone link with the shared phone constant (817-663-POOL / (817) 663-7665) so it can never drift from the rest of the site.
- Add the email `hi@savvyswim.com` as a second contact line next to the phone.
- Make the hours line up with what the profile will say, and label the block clearly as service-area coverage — "We come to your pool; no walk-in location" — so visitors and Google both understand there is no address to visit.
- Each city keeps its route day and link to its city page.

**Hours**
Confirm and use one set everywhere (site + Google):
- Monday – Friday 8:00 AM – 6:00 PM
- Saturday 9:00 AM – 2:00 PM
- Sunday Closed (emergency line only)

If any of these are wrong, say so and I'll change them before building.

**Structured data (`LocalBusiness`)**
- Keep the existing name, phone, email, hours and the city list, and drop the "Plano" address stub — a service-area business should publish `areaServed` and no locality-only `PostalAddress`. This is the exact shape Google expects to match a hidden-address Business Profile.

## Google Business Profile

Listings cannot be created from code — Google requires you to verify ownership from your own Google account. So this part is a written, step-by-step guide I add to the project (`docs/google-business-profile.md`) with the exact values to paste, all matched to the site:

1. Create the profile at business.google.com with the business name **Savvy Swim** (no keywords appended — that gets listings suspended).
2. Choose "I deliver goods and services to my customers" and **hide the address**. Enter your real mailing address only for verification; Google keeps it private.
3. Set the service areas to the twelve cities the map already lists: Plano, Frisco, McKinney, Allen, Prosper, Richardson, Garland, Dallas, Highland Park, University Park, Irving, Rockwall.
4. Category: **Swimming pool cleaning service** (primary), plus **Swimming pool repair service** and **Pool cleaning service** as secondary.
5. Phone, website (`https://savvyswimservices.com`), and hours copied verbatim from the values above — identical characters matter for matching.
6. Verify (postcard, phone or video, depending on what Google offers), then add services, photos and a description.
7. After verification: request reviews, and post the profile URL back to me so I can add it to `sameAs` in the structured data, which links the site and the listing together.

One profile is correct here. Creating a separate listing per city without a real staffed address in that city is against Google's guidelines and gets all of them suspended.

## Technical notes

- `src/lib/service-locations.ts` — add a `SERVICE_AREA_CONTACT` export (phone, email, hours, "no walk-in address" note) sourced from `@/lib/contact-info` and `@/lib/email-config`.
- `src/components/ServiceAreaMap.tsx` — render phone/email/hours from those constants instead of the inline `tel:+18176637665`.
- `src/lib/structured-data.ts` — remove the locality-only `address` block; keep `areaServed`, `telephone`, `email`, `openingHoursSpecification`. Add the Sunday closed spec so schema matches the displayed hours.
- New `docs/google-business-profile.md` with the copy-paste values and the verification checklist.
