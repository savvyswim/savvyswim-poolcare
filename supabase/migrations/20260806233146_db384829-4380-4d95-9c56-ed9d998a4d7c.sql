CREATE TABLE public.ss_canary_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  target text NOT NULL,
  source text NOT NULL DEFAULT 'cron',
  rounds integer NOT NULL DEFAULT 1,
  requests integer NOT NULL DEFAULT 0,
  failures integer NOT NULL DEFAULT 0,
  slowest_ms integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'ok',
  alert_result text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.ss_canary_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.ss_canary_runs(id) ON DELETE CASCADE,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  route text NOT NULL,
  url text NOT NULL,
  round integer NOT NULL DEFAULT 1,
  kind text NOT NULL,
  http_status integer,
  duration_ms integer NOT NULL DEFAULT 0,
  message text,
  stack text,
  body_snippet text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ss_canary_runs_started_idx ON public.ss_canary_runs (started_at DESC);
CREATE INDEX ss_canary_incidents_run_idx ON public.ss_canary_incidents (run_id, occurred_at DESC);

GRANT SELECT ON public.ss_canary_runs TO authenticated;
GRANT ALL ON public.ss_canary_runs TO service_role;
GRANT SELECT ON public.ss_canary_incidents TO authenticated;
GRANT ALL ON public.ss_canary_incidents TO service_role;

ALTER TABLE public.ss_canary_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ss_canary_incidents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners and office read canary runs" ON public.ss_canary_runs
  FOR SELECT TO authenticated USING (public.ss_is_office());
CREATE POLICY "Owners and office read canary incidents" ON public.ss_canary_incidents
  FOR SELECT TO authenticated USING (public.ss_is_office());