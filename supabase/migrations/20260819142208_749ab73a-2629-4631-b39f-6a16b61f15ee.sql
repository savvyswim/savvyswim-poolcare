ALTER TABLE public.ss_webhook_deliveries DROP CONSTRAINT IF EXISTS ss_webhook_deliveries_channel_check;
ALTER TABLE public.ss_webhook_deliveries ADD CONSTRAINT ss_webhook_deliveries_channel_check
  CHECK (channel IN ('lead','appointment','payment','ops'));

CREATE INDEX IF NOT EXISTS ss_webhook_deliveries_attempt_idx
  ON public.ss_webhook_deliveries (last_attempt_at DESC);

CREATE TABLE IF NOT EXISTS public.ss_webhook_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_key text NOT NULL UNIQUE,
  alert_type text NOT NULL,
  channel text,
  summary text NOT NULL,
  window_minutes integer NOT NULL,
  total_events integer NOT NULL DEFAULT 0,
  failed_events integer NOT NULL DEFAULT 0,
  failure_rate numeric NOT NULL DEFAULT 0,
  baseline numeric,
  alert_result text,
  alert_count integer NOT NULL DEFAULT 1,
  last_alerted_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.ss_webhook_alerts TO authenticated;
GRANT ALL ON public.ss_webhook_alerts TO service_role;

ALTER TABLE public.ss_webhook_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Office can read webhook alerts"
  ON public.ss_webhook_alerts FOR SELECT TO authenticated
  USING (public.ss_is_office());

CREATE TRIGGER ss_webhook_alerts_updated
BEFORE UPDATE ON public.ss_webhook_alerts
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();