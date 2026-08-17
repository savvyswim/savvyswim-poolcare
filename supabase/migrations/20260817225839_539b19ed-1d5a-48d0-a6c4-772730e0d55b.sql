-- 1. Backfill postal_code from the stored address string
UPDATE public.inspection_requests
SET postal_code = (regexp_match(address, '(\d{5})(?:-\d{4})?\s*(?:,\s*(?:USA|US))?\s*$'))[1]
WHERE coalesce(postal_code, '') = ''
  AND address ~ '\d{5}(?:-\d{4})?\s*(?:,\s*(?:USA|US))?\s*$';

-- 2. Strip the appended consent block from notes (consent lives in contact_consent / consent_text)
UPDATE public.inspection_requests
SET notes = nullif(
  btrim(regexp_replace(notes, '\n*Authorized calls/texts/email \(combined consent\):.*$', '', 'n')),
  ''
)
WHERE notes LIKE '%Authorized calls/texts/email (combined consent):%';

-- 3. Drop the unused preferred_slot column
ALTER TABLE public.inspection_requests DROP COLUMN IF EXISTS preferred_slot;