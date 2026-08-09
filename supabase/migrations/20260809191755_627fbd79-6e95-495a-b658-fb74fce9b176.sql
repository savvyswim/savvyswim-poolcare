CREATE TABLE public.inspection_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.inspection_requests(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  channel text,
  recipient text,
  outcome text,
  detail text,
  status_from text,
  status_to text,
  campaign_id text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  landing_page text,
  page_path text,
  referrer text,
  session_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX inspection_events_request_idx ON public.inspection_events(request_id, created_at DESC);
CREATE INDEX inspection_events_source_idx ON public.inspection_events(utm_source, event_type);

GRANT SELECT ON public.inspection_events TO authenticated;
GRANT ALL ON public.inspection_events TO service_role;

ALTER TABLE public.inspection_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can read inspection events"
ON public.inspection_events FOR SELECT TO authenticated
USING (public.ss_is_staff());