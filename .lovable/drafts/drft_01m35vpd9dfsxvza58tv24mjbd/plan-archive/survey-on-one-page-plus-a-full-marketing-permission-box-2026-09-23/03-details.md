## Technical notes

- `src/pages/Survey.tsx` drops the `step` state and the Next/Back handlers. It
  renders `visibleQuestions(answers)` in a single `<form>`, each question as a
  block with its options, followed by the contact fields. Validation runs once
  on submit, collects all errors, and focuses/scrolls to the first field with
  an error.
- Progress bar derives from answered count over visible count.
- Consent state splits into `consent` (required) and `marketingConsent`
  (optional, default false). `src/components/LeadForm.tsx` keeps exporting
  `CONSENT_TEXT`; a new `MARKETING_CONSENT_TEXT` is added beside it so both
  forms can reuse the same legal wording later.
- The submitted lead sends `consent_text` as the required wording, and appends
  the marketing line plus "Marketing opt in: yes/no" to the notes so the office
  and CRM have the record. No database change.
- Privacy Policy and Terms render as real links to the existing routes.
- No em dash anywhere in the copy.

### Verification

Typecheck, then load `/survey` in the browser: confirm all questions render at
once, submit with a missing name shows the error in place, and a submission
with name, phone and the required box lands on the thank you page. Test leads
get removed afterwards.
