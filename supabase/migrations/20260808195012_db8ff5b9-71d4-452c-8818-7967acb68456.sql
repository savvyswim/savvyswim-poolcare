ALTER TABLE public.ss_visits
  ADD COLUMN IF NOT EXISTS no_access_at timestamptz,
  ADD COLUMN IF NOT EXISTS no_access_reason text,
  ADD COLUMN IF NOT EXISTS no_access_photo_url text,
  ADD COLUMN IF NOT EXISTS drive_minutes integer,
  ADD COLUMN IF NOT EXISTS drive_miles numeric(8,2);

CREATE TABLE IF NOT EXISTS public.ss_job_time_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.ss_jobs(id) ON DELETE CASCADE,
  staff_id uuid REFERENCES public.ss_staff(id) ON DELETE SET NULL,
  worked_on date NOT NULL DEFAULT current_date,
  minutes integer NOT NULL DEFAULT 0,
  hourly_rate numeric(10,2) NOT NULL DEFAULT 0,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ss_job_time_entries TO authenticated;
GRANT ALL ON public.ss_job_time_entries TO service_role;
ALTER TABLE public.ss_job_time_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read job time" ON public.ss_job_time_entries
  FOR SELECT TO authenticated USING (public.ss_is_staff());
CREATE POLICY "office manages job time" ON public.ss_job_time_entries
  FOR ALL TO authenticated USING (public.ss_is_office()) WITH CHECK (public.ss_is_office());

CREATE TABLE IF NOT EXISTS public.ss_job_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.ss_jobs(id) ON DELETE CASCADE,
  label text NOT NULL,
  category text NOT NULL DEFAULT 'material',
  amount numeric(10,2) NOT NULL DEFAULT 0,
  spent_on date NOT NULL DEFAULT current_date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ss_job_expenses TO authenticated;
GRANT ALL ON public.ss_job_expenses TO service_role;
ALTER TABLE public.ss_job_expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read job expenses" ON public.ss_job_expenses
  FOR SELECT TO authenticated USING (public.ss_is_staff());
CREATE POLICY "office manages job expenses" ON public.ss_job_expenses
  FOR ALL TO authenticated USING (public.ss_is_office()) WITH CHECK (public.ss_is_office());

CREATE TRIGGER ss_job_time_entries_updated BEFORE UPDATE ON public.ss_job_time_entries
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER ss_job_expenses_updated BEFORE UPDATE ON public.ss_job_expenses
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE INDEX IF NOT EXISTS ss_job_time_entries_job_idx ON public.ss_job_time_entries(job_id);
CREATE INDEX IF NOT EXISTS ss_job_expenses_job_idx ON public.ss_job_expenses(job_id);

CREATE OR REPLACE FUNCTION public.ss_my_chem_history(_days integer DEFAULT 30)
RETURNS TABLE(visit_date date, readings jsonb)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT v.scheduled_date, v.readings
  FROM public.ss_visits v
  WHERE v.customer_id = public.ss_my_customer_id()
    AND v.readings <> '{}'::jsonb
    AND v.scheduled_date >= current_date - greatest(coalesce(_days, 30), 1)
  ORDER BY v.scheduled_date
$$;

REVOKE ALL ON FUNCTION public.ss_my_chem_history(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ss_my_chem_history(integer) TO authenticated;