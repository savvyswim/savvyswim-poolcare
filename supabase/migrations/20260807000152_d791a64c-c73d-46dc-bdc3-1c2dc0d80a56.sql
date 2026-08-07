ALTER TABLE public.ss_canary_runs
  ADD COLUMN IF NOT EXISTS revision_id text;

ALTER TABLE public.ss_canary_incidents
  ADD COLUMN IF NOT EXISTS request_id text;

CREATE INDEX IF NOT EXISTS ss_canary_incidents_request_id_idx
  ON public.ss_canary_incidents (request_id)
  WHERE request_id IS NOT NULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.ss_canary_runs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ss_canary_incidents;