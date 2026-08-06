CREATE TABLE public.ss_qc_reviews (
  id uuid primary key default gen_random_uuid(),
  tech_id uuid NOT NULL REFERENCES public.ss_staff(id) ON DELETE CASCADE,
  week_of date NOT NULL,
  reviewer_id uuid REFERENCES public.ss_staff(id) ON DELETE SET NULL,
  reviewer_name text,
  scores jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes jsonb NOT NULL DEFAULT '{}'::jsonb,
  average_score numeric(4,2),
  items_failed integer NOT NULL DEFAULT 0,
  top_strength text,
  development_area text,
  action_required text,
  signed_off_by text,
  signed_off_at timestamptz,
  pools_reviewed integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tech_id, week_of)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ss_qc_reviews TO authenticated;
GRANT ALL ON public.ss_qc_reviews TO service_role;

ALTER TABLE public.ss_qc_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Office staff manage QC reviews"
ON public.ss_qc_reviews FOR ALL TO authenticated
USING (public.ss_is_office())
WITH CHECK (public.ss_is_office());

CREATE POLICY "Techs read their own QC reviews"
ON public.ss_qc_reviews FOR SELECT TO authenticated
USING (tech_id = public.ss_my_staff_id());

CREATE TRIGGER ss_qc_reviews_updated
BEFORE UPDATE ON public.ss_qc_reviews
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();