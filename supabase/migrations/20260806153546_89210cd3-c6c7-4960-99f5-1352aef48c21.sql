CREATE TABLE public.ss_time_standards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  size_key text NOT NULL UNIQUE,
  label text NOT NULL,
  min_gallons integer NOT NULL DEFAULT 0,
  max_gallons integer,
  target_min_minutes integer NOT NULL DEFAULT 20,
  target_max_minutes integer NOT NULL DEFAULT 30,
  max_drive_minutes integer NOT NULL DEFAULT 8,
  notes text,
  sort_order integer NOT NULL DEFAULT 0,
  is_commercial boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ss_time_standards TO authenticated;
GRANT ALL ON public.ss_time_standards TO service_role;

ALTER TABLE public.ss_time_standards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff read time standards"
  ON public.ss_time_standards FOR SELECT TO authenticated
  USING (public.ss_is_staff());

CREATE POLICY "office manage time standards"
  ON public.ss_time_standards FOR ALL TO authenticated
  USING (public.ss_is_office())
  WITH CHECK (public.ss_is_office());

CREATE TRIGGER ss_time_standards_updated
  BEFORE UPDATE ON public.ss_time_standards
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

INSERT INTO public.ss_time_standards
  (size_key, label, min_gallons, max_gallons, target_min_minutes, target_max_minutes, max_drive_minutes, notes, sort_order, is_commercial)
VALUES
  ('small','Small (< 10k gal)',0,9999,15,20,8,'Efficient route = more pools/day',1,false),
  ('medium','Medium (10–20k gal)',10000,20000,20,30,8,'PSL standard pool size',2,false),
  ('large','Large (20–35k gal)',20001,35000,30,40,8,'May require 2x/week',3,false),
  ('xl','Extra Large (35k+ gal)',35001,NULL,40,60,8,'Price accordingly',4,false),
  ('commercial','Commercial',0,NULL,60,90,0,'Separate route recommended',5,true);
