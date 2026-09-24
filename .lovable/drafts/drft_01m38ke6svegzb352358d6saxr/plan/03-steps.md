## Steps (in stages, each one usable on its own)

1. **Check the old app first.** I compare what the SavvySwim app holds (customers, invoices, notes) with what this project holds, and list what has to be brought over. Nothing gets moved before you see that list.
2. **Office app.** One sign-in at savvyswim.com/office that brings together the bookings, calendar and follow-up pages already built, plus customers, invoices and messages. Office staff and technicians get separate views based on their role.
3. **Technician view.** A phone-first daily route, visit checklist, chemistry readings and photos.
4. **Customer app.** Sign-in, next visit, history and reports, reschedule, messages.
5. **Online payments.** Invoices paid by card. This needs a payment provider set up, and I will ask you to confirm before switching it on.
6. **Move the old app's data** into the shared database, then point savvyswim.app at the new system so old links keep working.
7. **Phone apps.** Home screen install first. The App Store and Google Play packages come after that, submitted with your developer accounts.

## Honest limits
- Stage 6 moves real business data, so I will show you exactly what moves and get your approval first.
- App store listings need your Apple and Google accounts, and Apple review usually takes a few days.
- This is several weeks of work in stages. I would start with stages 1 and 2.

## Technical notes
- A single project with role-based sections: customer, technician, office, owner. Roles live in a separate roles table, and every table is locked per role.
- Stage 1 is a read-only comparison. New tables for messages and payments are added as additive changes, which only take effect when this draft is accepted.
- For the stores, the web app gets wrapped as a native shell that you build in Xcode and Android Studio from an exported copy of the code.
