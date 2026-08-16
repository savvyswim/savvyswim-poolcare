ALTER TABLE public.inspection_requests
  ADD COLUMN IF NOT EXISTS contact_consent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS consent_text text,
  ADD COLUMN IF NOT EXISTS source text,
  ADD COLUMN IF NOT EXISTS lead_type text,
  ADD COLUMN IF NOT EXISTS crm_synced_at timestamptz;