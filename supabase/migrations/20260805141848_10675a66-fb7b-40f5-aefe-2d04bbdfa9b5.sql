ALTER TABLE public.ss_projects ADD COLUMN IF NOT EXISTS lead_staff_id uuid REFERENCES public.ss_staff(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.ss_project_alert_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.ss_projects(id) ON DELETE CASCADE,
  stage_id uuid REFERENCES public.ss_project_stages(id) ON DELETE CASCADE,
  alert_key text NOT NULL,
  channel text NOT NULL DEFAULT 'in_app',
  recipients text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ss_project_alert_log TO authenticated;
GRANT ALL ON public.ss_project_alert_log TO service_role;

ALTER TABLE public.ss_project_alert_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can read project alert log"
  ON public.ss_project_alert_log FOR SELECT TO authenticated
  USING (public.ss_is_staff());

CREATE POLICY "Office can write project alert log"
  ON public.ss_project_alert_log FOR INSERT TO authenticated
  WITH CHECK (public.ss_is_staff());

CREATE INDEX IF NOT EXISTS ss_project_alert_log_key_idx
  ON public.ss_project_alert_log (project_id, alert_key, created_at DESC);