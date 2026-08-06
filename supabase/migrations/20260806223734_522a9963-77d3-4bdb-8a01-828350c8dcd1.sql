CREATE TABLE public.ss_deploy_health_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checked_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL CHECK (status IN ('ok','degraded','failed')),
  http_status integer,
  boot_id text,
  failed_checks text[] NOT NULL DEFAULT '{}',
  detail text,
  alert_result text,
  source text NOT NULL DEFAULT 'cron'
);

CREATE INDEX ss_deploy_health_checks_checked_at_idx ON public.ss_deploy_health_checks (checked_at DESC);

GRANT SELECT ON public.ss_deploy_health_checks TO authenticated;
GRANT ALL ON public.ss_deploy_health_checks TO service_role;

ALTER TABLE public.ss_deploy_health_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners and office read deploy health"
ON public.ss_deploy_health_checks
FOR SELECT
TO authenticated
USING (public.ss_is_office());