# Booking alerts, a booking dashboard, and ad group reporting

Three of your four asks are partly built already. Here is what exists and what I would add.

## 1. Email for every booking request

Already in place: when someone submits the booking or inspection form, the office alert goes out with name, phone, address, requested date and where the lead came from, plus a copy into the connected Gmail inbox and a confirmation to the customer.

What I would add:
- A short "Booking request" subject and layout when the lead comes from the booking page, so it reads differently from a water test or general inspection.
- A delivery check page note in the admin area showing whether the last alerts sent or failed, so a silent failure never looks like "no leads".
- I will run one real test booking end to end and confirm the alert arrives.

## 2. Booking requests dashboard

New page at `/admin/bookings`, office sign-in only, showing every booking request with:
- Name, phone (tap to call), requested date, service area/city, address, status and when it came in
- Filters for last 7/30/90 days and all time, search by name or phone, and a "needs follow up" view for anything still new
- One-click status update (new, contacted, scheduled) and CSV export

The existing leads page stays as is; this one is focused on bookings you need to call back.

## 3. Meta ad performance by ad group

The `/admin/ads` report already shows visits, leads and booked jobs by channel and campaign. I would extend it to a third level: ad group and ad, read from the `utm_content` and `utm_term` tags on the ad links, so you can see which specific ad group drives bookings, with cost-free metrics (visits, leads, booked, visit to lead, lead to job).

For this to fill in, the Meta ad links need tags, for example:
`https://savvyswim.com/?utm_source=facebook&utm_medium=cpc&utm_campaign=spring-pools&utm_content=adgroup-name`

Spend and cost per booking are not available without connecting the Meta ads account, which is not something I can connect for you today.

## 4. Google My Business and directories

I cannot submit or verify a Google Business Profile for you: Google requires the owner to verify by postcard, phone or video, from your own Google account. What I will do instead:
- Prepare a single "business listing sheet" page in your admin area with the exact name, phone, hours, service areas, categories, description and photos to paste into each listing, so every directory matches
- Add the listing-ready structured data to the site so Google can match it once your profile is verified
- Give you a short step list for Google, Bing Places, Apple Business Connect, Yelp and Nextdoor

Once you finish Google verification and send me the profile link, I will connect it to the site and the review button.

## Technical notes

- Booking dashboard: new `src/lib/bookings-dashboard.functions.ts` (office-gated server function reading `inspection_requests` filtered to booking sources) plus `src/routes/admin/bookings.tsx`, matching the existing admin page patterns.
- Ads report: extend `AdsCampaignRow` with an `adGroups` level in `src/lib/ads-performance.server.ts`, reading `utm_content`/`utm_term` from `ss_site_events` and `inspection_requests`. If those columns are not stored yet, add them in a migration and capture them in the analytics intake and lead API.
- Booking email: branch the subject/labels in `src/lib/inspection-notify.server.ts` on the booking source.
