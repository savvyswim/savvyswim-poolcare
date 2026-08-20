CREATE TABLE public.ss_canary_route_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid REFERENCES public.ss_canary_runs(id) ON DELETE CASCADE,
  route text NOT NULL,
  target text NOT NULL,
  source text NOT NULL DEFAULT 'cron',
  checked_at timestamptz NOT NULL DEFAULT now(),
  requests integer NOT NULL DEFAULT 0,
  failures integer NOT NULL DEFAULT 0,
  error_rate numeric NOT NULL DEFAULT 0,
  avg_ms integer NOT NULL DEFAULT 0,
  min_ms integer NOT NULL DEFAULT 0,
  max_ms integer NOT NULL DEFAULT 0,
  p95_ms integer NOT NULL DEFAULT 0,
  last_http_status integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.ss_canary_route_metrics TO authenticated;
GRANT ALL ON public.ss_canary_route_metrics TO service_role;

ALTER TABLE public.ss_canary_route_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Office staff can view canary route metrics"
ON public.ss_canary_route_metrics
FOR SELECT
TO authenticated
USING (public.ss_is_office());

CREATE INDEX idx_ss_canary_route_metrics_route_time
  ON public.ss_canary_route_metrics (route, checked_at DESC);
CREATE INDEX idx_ss_canary_route_metrics_time
  ON public.ss_canary_route_metrics (checked_at DESC);