ALTER TABLE public.ss_project_stages
  ADD COLUMN IF NOT EXISTS depends_on_id uuid REFERENCES public.ss_project_stages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS lag_days integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS ss_project_stages_depends_on_idx ON public.ss_project_stages(depends_on_id);