CREATE TABLE public.ss_not_found_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  path text NOT NULL,
  full_url text,
  referrer text,
  internal_referrer boolean NOT NULL DEFAULT false,
  source text NOT NULL DEFAULT 'client',
  user_agent text,
  ip_address text,
  alerted boolean NOT NULL DEFAULT false,
  alert_result text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.ss_not_found_events TO authenticated;
GRANT ALL ON public.ss_not_found_events TO service_role;

ALTER TABLE public.ss_not_found_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Office can read 404 events"
  ON public.ss_not_found_events
  FOR SELECT
  TO authenticated
  USING (public.ss_is_office());

CREATE INDEX ss_not_found_events_created_idx ON public.ss_not_found_events (created_at DESC);
CREATE INDEX ss_not_found_events_path_idx ON public.ss_not_found_events (path, created_at DESC);