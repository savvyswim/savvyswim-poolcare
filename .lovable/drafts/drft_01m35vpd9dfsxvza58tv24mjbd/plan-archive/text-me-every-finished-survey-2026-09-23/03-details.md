## Technical details

Reuse `sendOpsAlertSms` from `src/lib/ops-alert.server.ts`, which already texts
`OPS_ALERT_PHONE` and falls back to `+18176637665` over the existing Twilio
gateway. No new secret, no new table.

`src/lib/inspection-notify.server.ts`, inside `sendInspectionNotifications`
after the office email loop:

- Detect a survey lead from the already-selected `source` column
  (`source` starts with `survey`).
- Build a compact body under 300 characters: name, phone, city or postal code,
  the first answer lines pulled from `notes`, and the reference number. Strip
  the consent block and the "Marketing opt in" line out of that summary.
- `await sendOpsAlertSms(body)` inside a `try/catch`, log the outcome, and add
  an `owner_sms` entry to the returned `recipients` map so the admin lead view
  shows delivery status.
- Log one inspection event with `detail = owner_survey_sms` using the existing
  `logInspectionEvents` helper so the same lead is never texted twice.

Verification: typecheck, then submit one test survey from the browser, confirm
the owner text row is recorded and the office email still sends, then delete
the test lead.
