# Same information on savvyswim.com and savvyswim.app

## Where things stand

Both addresses already read from one shared database: the same customers, visits, invoices and logins. Right now the website sends its requests to the app over the internet. If that sending step fails, the request waits for the 15-minute retry, and during that wait the two can briefly show different things.

## What I will do

1. **Check every place the website collects information** and make a complete list: the quote form, booking page, survey, consultation time picker, free water test, reviews, call and text taps, referrals, the Swim Club offer and new-customer sign-ups.
2. **Save each item straight into the CRM's own lead list** in the shared database, the moment it arrives. The app sees it instantly, with no waiting on a send.
3. **Keep the existing send to savvyswim.app as a backup.** This means the app's own alerts and automations still fire.
4. **Link visits and customers both ways.** When the website books a visit or creates a customer, the matching CRM lead moves to the right stage (new, contacted, won) automatically.
5. **Add a "Same on both" check to the Website to app page.** It shows anything on the website that is missing from the CRM, with one button to fix it.
6. **Test each form once, end to end,** after you publish, and confirm each one shows in the app.
