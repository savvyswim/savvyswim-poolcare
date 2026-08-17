# Clean up what a lead row stores

Three changes to the lead record so every field is meaningful and nothing important is buried in free text.

## 1. Capture ZIP separately

Right now the ZIP only exists inside the one-line address string, so `postal_code` saves as an empty string on every website lead.

- Parse the 5-digit ZIP out of the selected address (the Google address picker already returns a structured result that includes it) and send it as `postal_code`.
- When someone types an address by hand, fall back to a regex on the trailing 5 digits.
- Leave the full address string unchanged — the ZIP becomes an extra field, not a replacement.
- Backfill existing leads: pull the ZIP out of the stored address for rows where `postal_code` is blank.

Also worth fixing while there: the lead-sync admin table currently labels `postal_code` as "city". Once ZIP is real, that column will show a proper ZIP.

## 2. Consent stops being appended to notes

Consent is already stored properly in `contact_consent` (yes/no) and `consent_text` (the exact wording shown). The intake also glues that same paragraph onto the end of `notes`, which makes every lead's note look long and repetitive.

- Stop appending the consent block to `notes`; `notes` keeps only what the customer actually typed.
- Show consent in the admin/CRM views as its own line ("Authorized calls/texts/email: Yes" plus the wording on hover/expand), sourced from the two dedicated columns.
- Keep sending `contact_consent` and `consent_text` in the CRM handoff exactly as today, so the legal record is unchanged.
- Optional cleanup pass to strip the appended block from existing notes; the consent columns already hold the same text, so nothing is lost.

## 3. Unused columns

Two of the three "unused" columns are actually different:

- `preferred_slot` — genuinely unused by the website form. It is read in one place as a fallback for `preferred_contact_time`. Drop the column and simplify that read.
- `campaign_id` — **still in use**. The site's tracking code reads a `campaign_id` / `cid` URL parameter and the inspection-events reporting stores it. Recommend keeping it; it just happened to be empty on the lead we looked at because that visit had no campaign parameter.

If you'd rather drop `campaign_id` too, say so and I'll remove the tracking that feeds it in the same pass.

## Technical notes

- Migration: backfill `postal_code` from `address`; drop `preferred_slot` from `inspection_requests`.
- Data update: strip the appended consent paragraph from `notes` on existing rows.
- Code: `src/components/LeadForm.tsx` (send ZIP), `src/components/AddressAutocomplete.tsx` (surface the structured ZIP), `src/routes/api/public/leads.ts` (stop appending consent to notes), `src/lib/inspection-status-notify.functions.ts` (drop `preferred_slot` fallback), `src/lib/lead-sync.server.ts` (relabel the ZIP column).
- The CRM handoff payload in `src/lib/crm-lead-forward.server.ts` keeps every field it sends today and gains a real ZIP value.
