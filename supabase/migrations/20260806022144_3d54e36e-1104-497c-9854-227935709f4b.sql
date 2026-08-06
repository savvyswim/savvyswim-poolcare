ALTER TABLE public.ss_visits
  ADD COLUMN IF NOT EXISTS photos jsonb NOT NULL DEFAULT '[]'::jsonb;