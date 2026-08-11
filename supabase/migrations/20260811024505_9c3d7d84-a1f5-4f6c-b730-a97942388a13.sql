CREATE TABLE public.ss_site_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event text NOT NULL,
  page text NOT NULL,
  button text,
  consent_state text NOT NULL DEFAULT 'unset',
  utm_source text,
  utm_medium text,
  utm_campaign text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.ss_site_events TO authenticated;
GRANT ALL ON public.ss_site_events TO service_role;

ALTER TABLE public.ss_site_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can read site events"
  ON public.ss_site_events FOR SELECT TO authenticated
  USING (public.ss_is_staff());

CREATE INDEX ss_site_events_created_idx ON public.ss_site_events (created_at DESC);
CREATE INDEX ss_site_events_event_idx ON public.ss_site_events (event, created_at DESC);