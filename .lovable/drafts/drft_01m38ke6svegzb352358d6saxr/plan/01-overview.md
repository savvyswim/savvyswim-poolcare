## Goal
Move everything from the SavvySwim app (savvyswim.app) into this project so there's one site, one login and one set of customer records, then retire the app project.

## A correction first
I told you earlier that the website and the app already share the same customers and logins. **That was wrong.** Checking the app's code shows they're on two separate databases. The app has its own customers, visits, invoices, staff logins and about 190 database changes of its own. The website only talks to it by sending leads over. I'm sorry for the confusion.

## What moves
- **The office CRM**: leads, customers, quotes, contracts, invoices, payments, route schedule and settings (about 440 files).
- **The technician app**: today's route, visit checklists, chemical readings and photos.
- **The customer portal**: visits and reports, invoices, visit requests and messages.
- **Sign-in pages**: sign in, sign up, set password and the welcome screens for office, tech and customer.
- **All the app's data**: customers, visits, invoices, leads and files. People's logins come too, but everyone has to set a new password once, using a reset email.

## How it happens (in stages, the live site keeps working)
1. **Move the data into the website's database.** In the app project, I add a one-time, office-only export button that bundles the data. Here, I add a matching import that loads it in. That needs one short request run in the app project.
2. **Bring the screens over, one area at a time**: office CRM, then technicians, then the customer portal. They live under /crm, /tech and /portal on savvyswim.com. Each area gets tested signed in before the next one starts.
3. **Point savvyswim.app at this project.** Once you connect the savvyswim.app domain here, old links and bookmarks still work.
4. **Switch off the lead forwarding.** Leads stop being sent across because they're already in the same place. After a quiet week, you archive the old app project.
