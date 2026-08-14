# One combined authorization checkbox

## What changes

The booking / water-test form currently shows two boxes: a required "may contact me" agreement and a separate optional SMS opt-in. They become a single required checkbox holding the full legal authorization.

New wording (one box, must be checked to submit):

> I authorize **Savvy Swim** to contact me by phone call, text message and email about this request, including automated or prerecorded messages and appointment updates at the number I provided. Message and data rates may apply; message frequency varies. Reply **STOP** to opt out or **HELP** for help. I have read and agree to the Privacy Policy and Terms.

The privacy note below stays ("We never sell or share your information...", links to Privacy and Terms).

Checking the box now records both the contact consent and the SMS opt-in, so confirmations and appointment texts are authorized from a single agreement. The stored consent record keeps the exact wording shown, the page and the timestamp, so the audit trail matches what the visitor actually saw. Existing STOP / HELP handling is unchanged — anyone can still text STOP to stop messages.

Note: because it's one required box, a visitor who won't agree to texts can't submit the form. That's what you chose; the STOP reply remains their exit.

## Technical notes

- `src/components/LeadForm.tsx`: remove the second checkbox and `smsOptIn` state; the single `contactConsent` box drives both `contact_consent: true` and `sms_opt_in: true` in the POST body. Validation error stays on the one box.
- Consent copy moves into an exported constant so the same string is sent as the recorded consent text.
- `src/routes/api/public/leads.ts`: accept an optional `consent_text` and pass it to `recordSmsConsent` instead of the hardcoded string; notes line becomes a single "Authorized calls/texts/email (combined consent): yes".
- No change to `ss_sms_consent` schema, inbound STOP/START/HELP handling, or the CRM lead forward.
