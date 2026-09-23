## How a lead with no email or address still works

The lead records in the office system currently require an email and an address
on every row, so blank values cannot simply be saved.

- With no email, the lead is saved with a clear internal marker built from the
  phone number, for example `no-email.8176637665@savvyswim.com`, and the notes
  say "No email provided, contact by phone". The office sees the phone number as
  the way to reach them.
- With no address, the lead is saved as "Address not provided" and the notes say
  the same, so nobody mistakes it for a real address.
- Duplicate-submission and flood protection currently key off the email address.
  When there is no email it keys off the phone number instead, so protection
  stays in place and two people without email never collide.

## Technical notes

- `src/pages/Survey.tsx`: validation requires only `name`, `phone` and consent;
  email validates only when non-empty. The address input is replaced with
  `AddressAutocomplete` (already server-side, so suggestions work on
  savvyswim.com), with `AddressMapPreview` shown once a suggestion is picked.
- Submission builds `email` and `address` fallbacks as described above and adds
  the explanatory line to the notes, so the existing lead endpoint contract is
  unchanged.
- `src/routes/api/public/leads.ts`: the rate-limit and 10 minute dedupe lookups
  switch to the phone number when the email is a generated `no-email.` marker.
- No database change.
