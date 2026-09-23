## Technical notes

- `src/components/LeadForm.tsx`: add an exported `FULL_CONSENT_TEXT` (the new combined wording) and `CONSENT_VERSION = "2026-09-v1"` alongside the existing `CONSENT_TEXT` / `MARKETING_CONSENT_TEXT`, which stay as they are for the other forms.
- `src/pages/Survey.tsx`: render the new wording in the single required box with inline links to `/privacy-policy`, `/terms-and-conditions` and `/terms-and-conditions#sms`, and submit `consent_text: FULL_CONSENT_TEXT`, `sms_opt_in: true`, `contact_consent: true` plus a `consent_version` field. Keep the existing "Marketing opt in: yes" note line.
- `src/routes/api/public/leads.ts`: raise the `consent_text` limit from 1000 to 2000 characters, accept optional `consent_version` (40 chars), and capture the request IP (`x-forwarded-for` first hop) and `user-agent` on the insert.
- Proof columns do not exist yet on the lead table, so a staged additive migration adds `consent_version text`, `consent_ip text`, `consent_user_agent text` and `consent_at timestamptz`. These apply when the draft is accepted, not now, so the extra proof fields only start recording after that. The wording change itself works immediately.
- `src/pages/Terms.tsx`: add a `Text Message Terms` section with `id="sms"` covering program name, message types, frequency, rates, STOP and HELP keywords, support contact `hi@savvyswim.com` and 817-663-7665, carrier disclaimer, and a link to the Privacy Policy.
- `src/lib/sms-compliance.server.ts` keeps its STOP and HELP footer handling; no change to sending.
- No em dash anywhere in the new copy. This is a compliance-oriented draft, not legal advice, so it is worth a read from your attorney before launch.
