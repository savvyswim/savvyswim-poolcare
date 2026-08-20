CREATE TABLE public.ss_canary_route_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route text NOT NULL,
  target text NOT NULL,
  last_checked_at timestamptz NOT NULL DEFAULT now(),
  last_ok_at timestamptz,
  last_status text NOT NULL DEFAULT 'ok',
  last_kind text,
  last_http_status integer,
  last_duration_ms integer,
  last_message text,
  consecutive_failures integer NOT NULL DEFAULT 0,
  checks_total integer NOT NULL DEFAULT 0,
  last_run_id uuid REFERENCES public.ss_canary_runs(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (route, target)
);

GRANT SELECT ON public.ss_canary_route_checks TO authenticated;
GRANT ALL ON public.ss_canary_route_checks TO service_role;

ALTER TABLE public.ss_canary_route_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Office staff can view canary route checks"
ON public.ss_canary_route_checks
FOR SELECT
TO authenticated
USING (public.ss_is_office());

CREATE INDEX idx_ss_canary_route_checks_route ON public.ss_canary_route_checks (route);