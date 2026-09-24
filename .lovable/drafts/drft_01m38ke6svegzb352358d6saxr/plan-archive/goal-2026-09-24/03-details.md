## What I need from you
- The go-ahead to run one short request in the SavvySwim CRM project. It adds the temporary export button there.
- Accept each draft here as each stage finishes, because database changes only apply once a draft is accepted.
- Near the end, connect the savvyswim.app domain to this project in Domains.
- Card payments, emails and texts may need their keys added again here if the app has its own. I'll list exactly which ones before stage 3.

## Things to know
- It's a big move, done over several sessions, not one. Until the last stage, the old app keeps running unchanged.
- The app project also carries some old copy about vehicles and dents. None of it will be brought over.
- The pages this project already built (bookings, calendar, the /office hub) stay. Anything they duplicate from the app gets merged, not doubled.

## Technical details
- The app is on TanStack Start with its own backend. It has about 189 migrations, 20 edge functions and 580 files. This project also has `ss_*` tables of its own.
- Stage 1: compare the two schemas table by table. Stage any missing tables and columns as additive migrations here. The export is an office-gated server route in the app. The import is an office-gated server function here, idempotent and keyed on the original ids. Logins are re-created with the admin API using the same user ids, so every link survives. Stored files are copied bucket to bucket.
- Stage 2: copy `src/crm`, `src/crew`, `src/mobile` and the `_crm`/`_crew` routes. Rewrite each edge function as a `createServerFn` or `/api/public/*` route. Skip banned terms.
- Stage 4: remove `crm-lead-forward` and the retry cron once everything matches.
