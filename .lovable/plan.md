# Fix the Swim Club 404 and bring back the branded quote flow

## What's wrong

The "Swim Club" (and "Contact") links in the header of the Services, Weekly Pool Service, Frisco and city pages point at `/#membership` written as a single path. The router treats that whole string as a page address, finds no such page, and shows the "404 — Oops! Page not found" screen in your screenshot.

Confirmed in the code: `to="/#membership"` and `to="/#contact"` appear in
`src/pages/Services.tsx`, `src/pages/WeeklyPoolService.tsx`,
`src/pages/PoolCleaningFrisco.tsx`, and `src/pages/CityLanding.tsx`.

The Swim Club checkout link itself is fine — the Stripe page loads normally when opened directly, so nothing needs to change there.

## What I'll do

1. Fix the eight broken links so they go to the home page and scroll to the Swim Club / Contact section instead of 404ing.
2. Sweep the rest of the site for the same broken link pattern and fix any others.
3. Keep the branded on-site quote modal as the destination for every quote/booking button (the version we built, no CRM popup), and make sure the Contact link lands on that section rather than an off-site page.
4. Click through Services, Weekly Pool Service, Frisco and a city page in the preview to confirm: Swim Club scrolls to the membership block, Contact scrolls to the quote form, and the "Join in 60 seconds" button opens the $19.99/mo checkout.

## Technical detail

Replace `<Link to="/#membership">` with `<Link to="/" hash="membership">` (same for `contact`). TanStack Router requires the hash as its own prop; embedding it in `to` produces an unmatched route and renders `NotFound`.
