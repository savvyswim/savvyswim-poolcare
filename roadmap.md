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
