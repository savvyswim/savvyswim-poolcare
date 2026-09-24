ALTER TABLE public.ss_leads ADD COLUMN IF NOT EXISTS lead_score integer;
ALTER TABLE public.ss_leads ADD COLUMN IF NOT EXISTS score_reasons jsonb;
ALTER TABLE public.ss_leads ADD COLUMN IF NOT EXISTS lead_channel text;
ALTER TABLE public.ss_leads ADD COLUMN IF NOT EXISTS request_id uuid;
ALTER TABLE public.ss_leads ADD COLUMN IF NOT EXISTS portal_status text;
CREATE INDEX IF NOT EXISTS ss_leads_lead_score_idx ON public.ss_leads (lead_score DESC);
CREATE INDEX IF NOT EXISTS ss_leads_request_id_idx ON public.ss_leads (request_id);
