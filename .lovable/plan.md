# Survey to booked consultation on the schedule

Today the survey sends people to the thank you page, where a day and time picker sits low on the page. Picking a time saves the day and window on the lead, pushes it to the app and emails the office, but nothing lands on the schedule. Two changes fix that.

## 1. Pick the time first

On the thank you page, the day and arrival time picker moves above the confirmation text, right under the heading, so it is the first thing a customer sees after the survey. Wording stays the same: "Would you like to pick your consultation day now?" with Yes and "No, just call me".

Once a time is picked, the confirmation block shows the day and window, and the rest of the page ("what happens next", save our contact, thank you card) follows below.

## 2. The picked time becomes a real visit on the schedule

When the customer picks a day and arrival window, on top of what already happens today:

- The pool owner record is found by phone, or created from the survey details (name, phone, email, address, zip).
- A free consultation visit is put on the schedule for that day, with the arrival window and the survey notes attached so the tech knows what the pool needs.
- The lead is linked to that customer record and marked as scheduled, so it stops showing as needing follow up on the booking list.
- The day, window and visit are pushed to the SavvySwim app with the rest of the lead, and the office alert email now says a visit was placed on the schedule (or says it could not be placed, so nobody assumes it is booked).

Same day requests behave the same way, and the office email keeps its "SAME DAY" flag.

## Technical notes

- `src/pages/ThankYou.tsx`: `ConsultationPicker` moves above the intro paragraph and reference block; no changes to the component's own steps.
- `src/lib/consultation-slot.server.ts` (`saveConsultationSlot`): after the `inspection_requests` update, find or create `ss_customers` by phone, insert `ss_visits` (customer_id, scheduled_date, status pending, notes carrying the window plus the survey summary), then update the request with `converted_customer_id`, `converted_at` and `status: 'scheduled'`. Reuses the same find-or-create and insert logic already written for `scheduleBookingVisit` in `src/lib/booking-followup.functions.ts`, extracted into one shared server helper so both paths behave identically.
- Visit creation is wrapped so a failure never blocks the save: the customer still sees the confirmation, the office email reports the failure, and an `inspection_events` row records it.
- The CRM forward (`forwardInspectionToCrm`) already runs after the update, so the app copy picks up the new date, window and scheduled status with no extra call.
- No new tables or columns.
