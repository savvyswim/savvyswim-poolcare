# Office login, lead emails and the customer portal

## 1. Office login for hi@savvyswim.com
The login already exists (it uses the password you typed in chat). An invite only works for new people, so instead I send a **password reset email** to hi@savvyswim.com. Walkthrough:
1. Open the email "Reset your password" (check spam too).
2. Tap the link. It opens savvyswim.com/reset-password.
3. Type a new password (8 or more characters), twice, and tap Save.
4. You land on savvyswim.com/office. Sign in with hi@savvyswim.com and the new password. You should see the office tiles (bookings, calendar, leads).

This also replaces the password shared in chat. Sign-in emails can go out right away, even before your email address below is verified.

## 2. Every lead becomes a real email, in two places
You picked **both**:
- **Your mailbox:** each new lead sends an email to hi@savvyswim.com with name, phone, city, service, the requested day and a "Open this booking" button. Reply goes straight to the customer when they left an email.
- **The app inbox:** the same lead appears as an email conversation in the Inbox page of the app, so the office can reply from there and the whole thread stays with the lead.

Your new sender address notify.savvyswim.com is added but still waiting on DNS. Until it verifies, these emails (and customer confirmations) wait. The records to add are shown in Cloud, Emails.

## 3. Customer portal
You picked moving the app's existing portal instead of building a second one. It comes over in the merge after the app's data is imported (still waiting on the export step in the app project). Once moved it lives at savvyswim.com/portal, each customer sees only their own bookings, confirmations and visits, and the CRM customer page gets an "Open portal" link. Until then /portal keeps sending customers to savvyswim.app.
