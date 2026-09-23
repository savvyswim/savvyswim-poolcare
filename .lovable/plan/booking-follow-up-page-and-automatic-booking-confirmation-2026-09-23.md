# Booking follow-up page and automatic booking confirmation

Two pieces: a place where you reply to a booking request and put the visit on the calendar, and a confirmation email that goes out by itself the moment a booking comes in.

## 1. Follow-up page for each booking request

New page at `/admin/bookings/<request>`, reached by clicking any row on the existing booking list.

What is on it:
- The full request: name, tap to call phone, email, pool address, requested date and time, service asked for, anything they typed, where the lead came from and its campaign tags.
- A history strip: when it came in, when the app received it, every message you sent and every status change.
- A reply box. Pick a ready made message ("Confirmed for your date", "Two windows to choose from", "Need a little more info") or write your own. It sends from the Savvy Swim address with replies going to hi@savvyswim.com, and the customer sees the confirmed date, address, reference number and your phone number.
- A text option next to the reply, active only when the customer ticked the text consent box on the form.
- Schedule the visit: pick the date and a time window, add a note, press Schedule. That creates the customer record if they are not one yet, puts the visit on the route for that date, links the record back to the booking, and marks the booking as scheduled.
- Status buttons (new, contacted, scheduled, closed) matching the list page.

Every message and status change is written to the request history and sent across to the SavvySwim app, so nothing lives only on the website.

## 2. Automatic follow-up email on every booking

Booking requests already get an instant thank you email. It will be replaced with a booking specific version:
- Subject confirms the requested day, for example "Your pool inspection request for Wed, Sep 23".
- Body repeats the date, time window, pool address and reference number.
- A "Pick a different time" button that opens the booking page with their name, phone and reference already filled in.
- Call or text 817-663-7665 and reply to email both offered.

Water test and general inspection requests keep the wording they have today, so only bookings change.

## Technical notes

- New route `src/routes/admin/bookings.$id.tsx`, reusing the sign in and office check pattern from `src/routes/admin/bookings.tsx`.
- New `src/lib/booking-followup.functions.ts` (office gated server functions): `getBookingDetail`, `sendBookingReply`, `scheduleBookingVisit`.
- Replies send through `sendLovableEmail` with the shared sender in `src/lib/email-config.ts`; texts reuse the Twilio path already used by `src/lib/inspection-status-notify.functions.ts` and respect `sms_opt_in`.
- Scheduling finds or creates an `ss_customers` row from the request, inserts into `ss_visits` (customer_id, scheduled_date, status pending, notes), and fills `converted_customer_id` and `converted_at` on `inspection_requests`.
- Each action writes an `inspection_events` row and forwards to savvyswim.app through the existing forwarder, so the follow up shows up in the app too.
- Booking wording is a new branch inside the customer email in `src/lib/inspection-notify.server.ts`, keyed off the same booking check already used for the office alert.
- No new tables are needed.
