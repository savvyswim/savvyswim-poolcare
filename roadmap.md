# Roadmap: merge savvyswim.app into this project

- [x] Stage 1a: database additions for the app's 52 extra tables, 187 extra columns and 72 functions (staged, apply on draft accept)
- [ ] Stage 1b: export button in the SavvySwim CRM project (blocked: user runs the request there)
- [ ] Stage 1c: import here, logins re-created with same ids, files copied (blocked: 1a accepted and 1b done)
- [ ] Stage 2: bring over office CRM, then technician screens, then customer portal
- [ ] Stage 3: connect savvyswim.app domain here (user)
- [ ] Stage 4: switch off lead forwarding and retry job, archive old app
- [ ] Cloudflare Turnstile on /office (blocked: user's Turnstile keys)

## Office login, lead emails, portal (2026-09-24)
- [x] Password reset email sent to hi@savvyswim.com
- [x] Every lead email also goes to hi@savvyswim.com with an "Open this booking" button
- [x] New leads added to the app inbox as a conversation (works once the draft is accepted)
- [ ] Switch sender to notify.savvyswim.com (blocked: must be done from the main project after accepting; DNS still pending)
- [ ] Customer portal: move the app's portal (blocked: merge import, stage 2c)
- [x] 90-day website requests all in the CRM lead list (12 of 12)
- [ ] Confirm they show in the savvyswim.app lead list (blocked: CRM connection unavailable; resend works from the live site)
- [ ] Office walkthrough (test request, confirmation, schedule, calendar)
- [ ] Customer portal on savvyswim.com (booking, schedule, messages, invite button)
- [ ] Turnstile (blocked: keys)
- [x] Lead score (0 to 100) and source on the bookings list, sortable; saved on CRM leads after accept
- [x] Fresh reset email to hi@savvyswim.com
- [ ] Match check (website / CRM / app inbox) on Website to app page
- [ ] Portal login per booked lead + /portal page + Invite to portal
- [ ] Office test booking end to end (after password set)
