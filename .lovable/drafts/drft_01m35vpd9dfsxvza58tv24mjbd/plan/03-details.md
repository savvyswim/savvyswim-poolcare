## Technical notes

- Prefilled booking: `src/routes/book.tsx` gains `validateSearch` for `name`,
  `phone`, `address`, `zip` and `ref`; `src/pages/Schedule.tsx` takes an optional
  `prefill` prop and seeds its form fields from it. No behavior change when the
  params are absent.
- `src/lib/survey-followup.server.ts` (new) owns the sequence: offsets
  `[24, 72, 168]` hours from `created_at`, one step per run, branded email built
  in the existing house style plus a short SMS body, both linking to
  `https://savvyswim.com/book?...` with the prefill params and the reference.
- Eligibility query on `inspection_requests`: `source` starting with `survey`,
  `created_at` inside the offset window, `status` still open (skip scheduled,
  booked, won, converted, customer, completed, lost, spam), and
  `converted_at is null`.
- Dedupe and reporting reuse `inspection_events` through
  `logInspectionEvents`, with `detail` set to `survey_followup_<hours>h`; a lead
  with that event already logged is skipped, so a re-run never double sends.
- Channels: email only when the address is real (skip the `no-email.` marker);
  SMS only when `sms_opt_in` is true, through the same Twilio gateway and
  compliance helper the reminder hook already uses, with STOP wording.
- New cron route `src/routes/api/public/hooks/survey-followups.ts`, guarded by
  `guardOpsHook` like the other ops hooks, returning counts only and no personal
  details. Scheduled with pg_cron once daily at 15:00 UTC (10 AM Central) so
  nudges land in business hours; one run a day, so the cost stays negligible and
  a nudge can land up to a day after its mark.
- `src/lib/inspection-notify.server.ts`: add the booking button to the existing
  homeowner confirmation, and keep skipping the send for `no-email.` addresses.
- Route manifest and smoke lists pick the new hook up from the generator; no
  database change, no new table. No em dash anywhere.

### Verification

Typecheck, load `/book?name=...&phone=...` and confirm the fields are prefilled,
then call the hook against a test survey lead backdated by a day and confirm one
email plus one text go out, a second call sends nothing, and the lead event list
shows the follow up. Remove the test lead afterwards.
