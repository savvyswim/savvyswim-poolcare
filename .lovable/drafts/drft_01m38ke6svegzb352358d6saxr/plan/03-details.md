## Technical details
- Stages map onto the existing `ss_stage` enum: Enquiry = new_lead/contacted, Quote = quote_sent/follow_up, Booking = `pipeline_stage` text column `booking` (staged additive migration on `ss_leads`), Won = won, Lost = lost. `syncRequestToCrmLead` sets stage from events; `scheduleVisitFromRequest` sets booking; visit done sets won.
- `/admin/leads` gains a Stage column with a 4-segment bar and select calling an office-gated `setLeadStage` server fn; stage filter counts.
- Match check: `getMatchReport` compares `inspection_requests` vs `ss_leads.request_id` vs `ss_email_threads` subject ref; `fixMatch` reruns sync + `addLeadToInbox`.
- Portal: invite-on-book via `inviteUserByEmail` (redirect /reset-password) linking `ss_customers.user_id`; `/portal` rewritten with `requireSupabaseAuth` fns scoped by `ss_my_customer_ids()`; messages via `ss_tickets`/`ss_ticket_messages`; office reply box on `/admin/bookings/$id`.
- Test: recovery email to hi@savvyswim.com; test customer created with a password login from the office; Playwright under /tmp/browser/e2e-portal; test rows deleted.
