## Technical details

`src/routes/__root.tsx`
- Tab render condition becomes: hide on `/` and on `/survey`, unchanged elsewhere.

`src/pages/Survey.tsx`
- Drop `marketingConsent` state and the second label block.
- Single `consent` checkbox with the merged text, still validated in the submit
  handler with the error under the box and scroll to the first error.
- Submit payload: `sms_opt_in: consent`, `contact_consent: consent`,
  `consent_text` set to the merged text, notes line becomes
  `Marketing opt in: yes` when the box is ticked (it is required, so always yes
  for a submitted survey).
- Links keep pointing at `/privacy-policy` and `/terms-and-conditions`.

No database change, no change to any other form on the site.

Verification: typecheck, then load `/survey` in the browser at mobile width,
confirm the tab is gone, try submitting without ticking (blocked), tick and
submit one test lead, then delete that test lead.
