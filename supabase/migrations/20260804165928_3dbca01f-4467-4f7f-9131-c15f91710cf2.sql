CREATE TABLE public.contact_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL CHECK (event_type IN ('call_click','text_click')),
  placement text,
  page_path text,
  referrer text,
  session_id text,
  user_agent text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT INSERT ON public.contact_events TO anon, authenticated;
GRANT SELECT ON public.contact_events TO authenticated;
GRANT ALL ON public.contact_events TO service_role;

ALTER TABLE public.contact_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can log a contact event"
ON public.contact_events FOR INSERT TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Admins can view contact events"
ON public.contact_events FOR SELECT TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE INDEX contact_events_created_at_idx ON public.contact_events (created_at DESC);