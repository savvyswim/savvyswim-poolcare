# Google Business Profile — Savvy Swim setup guide

Savvy Swim is a **service-area business**: we drive to the customer's pool and
have no walk-in location. Google supports this, but only if the profile is set
up as a service-area business with the address hidden. Everything below matches
the live site exactly — copy the values verbatim, character for character.
Mismatched name/phone/hours between the site and the profile is the single
biggest reason listings fail to rank or get suspended.

Listings cannot be created programmatically: Google requires ownership
verification from your own Google account. Work through these steps once.

## Copy-paste values

| Field | Value |
| --- | --- |
| Business name | `Savvy Swim` |
| Website | `https://savvyswimservices.com` |
| Phone | `(817) 663-7665` (same line as 817-663-POOL) |
| Email | `hi@savvyswim.com` |
| Primary category | Swimming pool cleaning service |
| Secondary categories | Swimming pool repair service; Pool cleaning service |
| Address | Hidden — service-area business |

### Hours

| Day | Hours |
| --- | --- |
| Monday – Friday | 8:00 AM – 6:00 PM |
| Saturday | 9:00 AM – 2:00 PM |
| Sunday | Closed (emergency line only) |

### Service areas (the twelve cities on the site map)

Plano, Frisco, McKinney, Allen, Prosper, Richardson, Garland, Dallas,
Highland Park, University Park, Irving, Rockwall — all TX.

### Description (750 char limit, this fits)

> Savvy Swim is a weekly pool service company covering North Dallas and Collin
> County. We handle pool cleaning, water chemistry balancing, filter and pump
> service, and equipment repair, and we send a photo report after every visit
> so you can see exactly what was done. Licensed, insured technicians run set
> weekly routes in Plano, Frisco, McKinney, Allen, Prosper, Richardson,
> Garland, Dallas, Highland Park, University Park, Irving and Rockwall. Free
> pool inspection for new customers.

## Steps

1. Go to <https://business.google.com> and sign in with the Google account that
   should own the listing (use a company account, not a personal one — you
   cannot easily change owners later).
2. Click **Add your business** and enter the name exactly as `Savvy Swim`.
   Do **not** append keywords such as "Pool Cleaning Plano" — keyword stuffing
   the name is the most common cause of suspension.
3. Choose the primary category **Swimming pool cleaning service**.
4. When asked "Do you want to add a location customers can visit?" answer
   **No**.
5. Choose **I deliver goods and services to my customers**, then enter the
   twelve service-area cities listed above.
6. Enter your real mailing address only when Google asks for it for
   verification. Confirm the address is **hidden** from the public profile —
   the toggle appears under Info › Business location after verification.
7. Enter the phone number and website from the table above.
8. Verify. Google offers postcard, phone, email or video verification depending
   on the category and location. Video verification is common for service-area
   businesses: have your branded vehicle, equipment and any signage ready.
9. After verification is approved:
   - Set the hours exactly as in the table (add Sunday as Closed).
   - Paste the description.
   - Add the service list (weekly cleaning, chemistry balancing, filter clean,
     equipment repair, green-pool recovery, free inspection).
   - Upload at least 10 photos: logo, van, techs working, before/after pools.
     Real photos, no stock.
10. Start requesting reviews from existing customers. Ask them to mention the
    city — it is a genuine local ranking signal.

## After it is live

Send the public profile URL back into the project. It gets added to the
`sameAs` array in `src/lib/structured-data.ts`, which explicitly connects the
website's `LocalBusiness` markup to the verified listing.

## Do not do this

Creating a separate profile per city — "Savvy Swim Frisco", "Savvy Swim Plano"
— without a real, staffed address in that city violates Google's guidelines and
typically gets every profile in the group suspended. One profile with twelve
service areas is the correct and safe setup.
