CREATE TABLE public.ss_failure_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_key text NOT NULL UNIQUE,
  account_name text,
  window_minutes integer NOT NULL DEFAULT 15,
  total_events integer NOT NULL DEFAULT 0,
  failed_events integer NOT NULL DEFAULT 0,
  failure_rate numeric(5,2) NOT NULL DEFAULT 0,
  threshold_pct numeric(5,2) NOT NULL DEFAULT 25,
  alert_result text,
  alert_count integer NOT NULL DEFAULT 0,
  last_alerted_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.ss_failure_alerts TO authenticated;
GRANT ALL ON public.ss_failure_alerts TO service_role;

ALTER TABLE public.ss_failure_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view failure alerts"
ON public.ss_failure_alerts FOR SELECT TO authenticated
USING (public.ss_is_staff());

CREATE TRIGGER ss_failure_alerts_updated
BEFORE UPDATE ON public.ss_failure_alerts
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();