## What this does
Four things, in the order they can actually be finished.

### 1. Pipeline stage on the CRM lead list
On the office Leads page, every lead gets a four-step progress bar: **Enquiry, Quote, Booking, Won** (plus a quiet "Lost" option). A small selector on each row lets you move a lead by hand. Stages also move on their own:
- New website request: Enquiry
- Quote or confirmation sent: Quote
- Visit placed on the schedule: Booking
- First visit done: Won

A filter at the top shows how many leads sit in each stage.

### 2. Every new lead lands in the app inbox as a real email
Each new request already emails hi@savvyswim.com. Next, it also appears as a conversation in the app inbox, carrying the customer's real email so you can reply from there. A "Match check" box on the Website to app page lists any request missing from the lead list or the inbox, with a Fix button. The inbox part only starts working once you accept this draft.

### 3. Customer portal at savvyswim.com/portal
When a visit is booked for a customer with a real email, they get an invite to set a password. Signed in, they see their booking, confirmations, upcoming visits (with "Request a different day") and a Messages tab. Their messages show on the booking page in the office, where you can reply.

### 4. End-to-end test
- A fresh password reset email goes to hi@savvyswim.com (the login already exists, so a new invite would not work). You set the password from that email.
- I then create a test customer booking, confirm it, schedule the visit, sign in as that customer, send a portal message, reply from the office, and check the lead moves Enquiry to Booking and appears in the inbox. Test records are removed afterward.

Limits: customer emails (confirmations, portal invites) still won't send until the email sending address is set up, so during the test I'll check the portal with a test login instead of the invite email. Items 2 and 3 need the draft accepted before they work live.
