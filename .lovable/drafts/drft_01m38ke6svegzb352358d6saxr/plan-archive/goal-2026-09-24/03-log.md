## 4. CRM lead delivery log

On the Website to app page, a new "Lead delivery" list showing every lead attempt with:

- **Sent**: the CRM accepted it (shows the CRM lead number).
- **Bounced**: the CRM refused or did not answer; the automatic resend every 15 minutes keeps trying. Shows the reason and how many tries.
- **Abandoned**: gave up after 8 tries, or the lead no longer exists. Shows a Resend button.

Filters by status and date, counts at the top ("42 sent, 2 bouncing, 1 abandoned"), and tapping a row opens the booking.

## Technical details

- Delivery attempts are already recorded per lead; the list reads them and maps outcomes: success to Sent, failed with attempts under 8 to Bounced, failed at 8 or skipped to Abandoned. No database changes needed.
- Office account: create the invite with the admin auth API, then add an ss_staff row (level owner, user_id linked) as a one-time data write, after your OK.
- New /reset-password page plus resetPasswordForEmail on /office.
- Live test uses a signed-in session for hi@savvyswim.com, minted after you have set the password.
