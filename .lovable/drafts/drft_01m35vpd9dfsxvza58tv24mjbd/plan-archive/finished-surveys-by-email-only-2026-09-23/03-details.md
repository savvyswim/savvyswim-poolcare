## Technical details

In `src/lib/inspection-notify.server.ts`:

- Remove the survey-only `sendOpsAlertSms` block.
- Remove its owner SMS delivery-event entry.
- Restore the email result mapping to cover email recipients only.
- Do not alter the existing homeowner confirmation text, because that is sent to the visitor only when they explicitly consented.

Verification: run the typecheck and confirm a completed survey still reaches the office email notification path without attempting an owner SMS.
