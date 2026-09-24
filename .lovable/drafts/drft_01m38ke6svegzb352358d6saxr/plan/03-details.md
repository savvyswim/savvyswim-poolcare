## Technical details
- Reset: call the auth recover endpoint for hi@savvyswim.com with redirect to https://savvyswim.com/reset-password (default auth sender, works now). Add savvyswim.com/reset-password to allowed redirect URLs if missing.
- Sender: the project domain is now notify.savvyswim.com (pending). Scaffold app email templates, add a `new-lead-office` template (Riviera colors, white body), and switch `FROM_ADDRESS` to the scaffolded sender. This replaces the old notify.savvyswimservices.com sender, which is no longer attached to this project; memory updated to match.
- Office lead email: sent from `forwardInspectionToCrm` right after `syncRequestToCrmLead`, to hi@savvyswim.com, idempotency `lead-office-<requestId>`, reply_to = customer email when real. The Gmail alert to marcus@ stays as backup.
- App inbox: the app keeps threads in `ss_email_threads` / `ss_email_messages` (tables added by the staged merge migration). Insert one inbound thread + message per lead, linked to the ss_leads row, dedupe on the request ref. Runs only once the draft is accepted; until then it is skipped safely. After the full merge, the app's Inbox page reads these directly.
- Portal: part of merge stage 2c (roadmap), after import (stage 1c). Add "Open portal" link on the customer page; RLS through `ss_my_customer_ids()`.
- Roadmap updated with these three items.
