CREATE TABLE public.ss_webhook_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel text NOT NULL CHECK (channel IN ('lead','appointment','payment')),
  direction text NOT NULL DEFAULT 'outbound' CHECK (direction IN ('inbound','outbound')),
  event_key text,
  endpoint text,
  reference text,
  outcome text NOT NULL DEFAULT 'failed' CHECK (outcome IN ('success','failed','skipped')),
  http_status integer,
  attempts integer NOT NULL DEFAULT 1,
  last_error text,
  request jsonb NOT NULL DEFAULT '{}'::jsonb,
  response text,
  retried_by uuid,
  retried_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_attempt_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ss_webhook_deliveries_recent_idx
  ON public.ss_webhook_deliveries (channel, last_attempt_at DESC);
CREATE UNIQUE INDEX ss_webhook_deliveries_event_idx
  ON public.ss_webhook_deliveries (channel, event_key) WHERE event_key IS NOT NULL;

GRANT SELECT ON public.ss_webhook_deliveries TO authenticated;
GRANT ALL ON public.ss_webhook_deliveries TO service_role;

ALTER TABLE public.ss_webhook_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Office can read webhook deliveries"
  ON public.ss_webhook_deliveries FOR SELECT TO authenticated
  USING (public.ss_is_office());