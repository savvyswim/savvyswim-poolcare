# Booking follow-up conversation and a bookings calendar

These go in the office pages on the website, next to the bookings list you already have. They use the same sign-in and the same saved booking requests.

## 1. Follow-up conversation (upgrade the existing booking page)
The page you get by clicking a name in the bookings list already has a reply box and a schedule form. It becomes a real conversation:
- **Message thread:** every email and text you send, and every step in the booking, shows in order with date and time, like a chat.
- **Send confirmation email:** a one-click "Send confirmation" button that emails the customer their day, arrival window, reference and a "Pick a different time" link. It is sent from notify.savvyswimservices.com, and replies go to hi@savvyswim.com. Leads with no real email, such as survey leads that skipped it, show "No email, call instead" rather than a send button.
- **Did they book? tracker:** a clear status bar with the steps New, Contacted, Confirmation sent, Booked and Visit done, plus "Lost". It moves forward on its own:
  - Contacted when you send a reply
  - Confirmation sent when the confirmation email goes out
  - Booked when a visit is placed on the schedule, or the customer picks a time on the thank-you page
  - Visit done when that visit is marked complete
- **On the bookings list:** a new "Booked?" column and a filter for "Replied but not booked", so you can see who to chase.
- **Conversion number:** at the top of the list, bookings requested versus booked, with the booking rate for the chosen period.

## 2. Calendar page (new, /admin/calendar)
- A week view by default, with a month view you can switch to, and arrows to move between weeks or months plus a "Today" button.
- Each day shows its upcoming free consultations and visits. Each entry has the customer name, arrival window and city.
- Entries are **grouped and color coded by service area**: the twelve route cities, plus "Other DFW".
- A service area filter across the top, to show one city or all of them.
- A small count per city for the week, such as "Plano 4, Frisco 2".
- Click an entry to open that booking's conversation page.
- Booking requests that are not yet on the schedule show as dashed "Requested" entries, so incoming demand is visible before it is confirmed.
- A link to the calendar from the bookings list and the office menu.

## Not included
- No change to the SavvySwim app itself (savvyswim.app). Everything still forwards there as it does today.
- No Google Calendar sync.

## Technical notes
- No new tables. Status is derived from existing `inspection_requests.status`, `inspection_events` (reply and confirmation rows), and linked `ss_visits` through `converted_customer_id`. Add `confirmation_sent` and `lost` to the allowed values in `setBookingStatus`.
- `src/lib/booking-followup.functions.ts`: add `sendBookingConfirmation`. It is office gated, uses `sendLovableEmail` with idempotency key `booking-confirm-{id}-{date}`, skips `no-email.` placeholders, and logs an `inspection_events` row. `getBookingDetail` returns a merged, time-ordered thread plus the derived stage.
- `src/lib/bookings-dashboard.functions.ts`: add a derived `stage` per row, the requested vs booked totals, and a "replied not booked" filter.
- New `src/lib/bookings-calendar.functions.ts`: `getCalendar({from, to, area?})`, office gated with `ss_is_office`. It returns scheduled `ss_visits` joined to `ss_customers` for city, and unscheduled booking requests by `preferred_date`. City is mapped to a service area through `SERVICE_LOCATIONS`, with anything else going to "Other DFW".
- New route `src/routes/admin/calendar.tsx`, using the same sign-in gate pattern as `admin/bookings.tsx`. The area colors come from brand tokens (burgundy, aqua, cream shades), with square corners.
- Verify: typecheck, then sign in to the office pages with Playwright. Send a confirmation to a test request and check the thread and stage update. Place a test visit and check that it appears on the calendar under the right city. Clean up the test data afterwards.
