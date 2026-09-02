# Free inspections, maps and indexing

Five items: validate discount codes, get the new domains indexed, stop the plain
map fallback on savvyswimservices.com, put real pool locations and hours on the
map, and give you a leads dashboard.

## 1. Discount / referral code validation

Today the code is typed on the free-inspection form and sent to the server, but
the server drops it — it is never checked and never stored on the lead.

- Check the code live as the visitor types (debounced) against the promo code
  table, and show a clear state under the field: valid ("15% off applied"),
  unknown code, or expired/inactive.
- An invalid code never blocks the submit — the lead still comes through, just
  flagged so the office can follow up.
- Store the code on the inspection request, plus whether it validated and what
  discount it maps to, so it shows up in the CRM and on the leads dashboard.
- Referral codes (a customer's own code) are treated the same way: matched
  against the same table, marked as a referral rather than a discount.

## 2. Sitemap and robots for Google Search Console

- Refresh the sitemap so it lists every live public page, including the city
  pool pages, `/services`, `/weekly-pool-service` and `/schedule`, all pointed
  at savvyswimservices.com.
- Confirm robots.txt allows crawling and references the sitemap.
- Verify the property in Search Console and submit the sitemap through the
  connected account, then report back what Google accepted.

## 3. Custom domain: no more plain fallback card

Google only allows the shared Lovable map key on lovable.app addresses, so on
savvyswimservices.com the interactive map cannot load. Rather than showing the
text-only confirmation card, the server-rendered map image becomes the primary
experience on your domains:

- The static map (rendered on our server, works on any domain) loads first and
  stays as the visible map.
- The plain text card only appears if even the static map fails.
- Keep the "Open in Google Maps" link on top of the image so visitors can still
  get directions.

## 4. Real pool locations and hours

Public website:

- A service-area map showing each city we cover, with a pin per city linking to
  that city's pool service page, plus business hours and phone.
- Matching LocalBusiness / service-area structured data so Google can show the
  hours and areas in search results.

CRM (staff only):

- A map view of actual pool records with their addresses, so routes and
  coverage are visible at a glance. Uses the existing pool data; nothing
  customer-identifying is exposed publicly.

## 5. Leads dashboard

New admin page listing every free-inspection request:

- Table: date, name, city, source/campaign, discount code, status.
- Counts for today / this week / this month, and a simple trend.
- Filter by source and by date range; export to CSV.

## Technical notes

- Validation calls the existing `check_promo_code` database function through a
  server function (the function is service-role only, so it stays server-side).
- `promo_code` is already a column on inspection requests; the public leads API
  will start writing it along with a validation result.
- Static-map-first behaviour is a change to the layered logic in
  `AddressMapPreview.tsx`; no new Google key required.
- City map uses the server-side maps gateway (static map + pins), so it works
  on every domain.
- Leads dashboard reads `inspection_requests` under the existing office/staff
  role check, alongside `/admin/lead-sources`.
