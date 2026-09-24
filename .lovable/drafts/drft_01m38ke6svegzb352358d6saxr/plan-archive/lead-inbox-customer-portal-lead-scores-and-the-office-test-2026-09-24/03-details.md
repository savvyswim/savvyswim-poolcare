## Technical details
- Schema (staged additive migration, applies on accept): `ss_leads` add `lead_score int`, `score_reasons jsonb`, `lead_channel text`, `request_id uuid`, `portal_status text`. `source` already exists and is kept.
- Scoring: pure function `scoreLead(req, events)` in `src/lib/lead-score.ts`; computed in `syncRequestToCrmLead` and recomputed on reply, confirmation and schedule; backfill button for the last 90 days.
- Inbox: `addLeadToInbox` already inserts threads; add match check `getMatchReport` (inspection_requests vs ss_leads vs ss_email_threads by ref) plus fix action.
- Portal: after `scheduleVisitFromRequest` succeeds and the request has a real email, office-side `inviteUserByEmail` with redirect /reset-password, link `ss_customers.user_id`. `/portal` page with `requireSupabaseAuth` server fns scoped by `ss_my_customer_ids()`; messages via `ss_tickets`/`ss_ticket_messages` (verify customer RLS; stage policy if needed); reschedule via `ss_request_visit_reschedule`.
- Office test: recovery email via auth recover endpoint; minted office session; Playwright under /tmp/browser/leadtest; test rows removed.
- Nothing about the CRM connection to savvyswim.app can be checked while that connection is down; the match check covers this site's records.
