## Technical notes
- Write directly to `ss_leads` (and `ss_lead_events`) from the lead, booking, survey, consultation, review, contact-tap and referral server paths, all through one shared helper. Match on phone or email so repeat submissions update one lead instead of making duplicates.
- Store the `ss_leads` id on `inspection_requests` so each lead links both ways. If that needs a new column, it is added as an additive change that applies when the draft is accepted.
- The existing POST to savvyswim.app/api/public/leads plus the retry cron stay in place. Duplicate protection uses the same reference number.
- The "Same on both" report compares `inspection_requests` against `ss_leads` and repairs gaps, office-gated.
- No data is deleted.
