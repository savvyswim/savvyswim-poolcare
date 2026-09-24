# Leads to the CRM, office walkthrough, sign-up check and customer portal

## 1. Bring the 90-day website requests into the CRM
- Run the "Add them to the CRM" step from the Same on both box, so every website request from the last 90 days gets a CRM lead.
- The app at savvyswim.app keeps its own lead list, so each of those requests is also re-sent to the app (the same way new leads are sent today). Anyone already there is updated, not duplicated.
- Confirm: read the app's lead list directly and check each reference shows up. You get a short list: found, newly added, or failed (with the reason).

## 2. Office login and the full booking walkthrough
- Your login already exists, so there's nothing to invite. The reset email went out this morning; if it didn't arrive I send another. Only you can pick the password, so I never set it for you.
- Once you've set it, I sign in as the office and test with one test request marked as a test:
  1. It shows on the bookings list as Open, and in the CRM lead list.
  2. Send confirmation: the progress bar moves to "Confirmation sent" and the email shows in the conversation (it only really goes out once your sender address is verified).
  3. Schedule a visit: the bar moves to "Booked", the visit appears on the calendar in the right city color, and the CRM lead changes to won.
  4. Then I delete the test request and visit.

## 3. Sign-up test with the human check: blocked
- savvyswim.com has no public sign-up. The office login only lets people sign in or reset a password, and new accounts are created by the office.
- The human check still needs your two Cloudflare Turnstile keys. Once you send them I add the check to sign in and forgot password, and test it with a real attempt. For "appears in the CRM", I test by creating a customer from the office pages and checking it shows in the customer list.

## 4. Customer portal on savvyswim.com
A signed-in pool owner sees only their own information, at savvyswim.com/portal:
- **My booking:** each request they made, its reference, status and the confirmation we sent.
- **My schedule:** upcoming and past visits, with the day and arrival window. A "Request a different day" button uses the existing reschedule request.
- **Messages:** a simple conversation with the office. New customer messages show in a Messages page in the office pages and email hi@savvyswim.com.
- The office customer page and the booking page get an "Invite to portal" button that emails the customer a sign-in link.
- This replaces the redirect to savvyswim.app. When the app's own portal comes over in the merge, its extras (invoices, water reports) get added here, not built twice.
