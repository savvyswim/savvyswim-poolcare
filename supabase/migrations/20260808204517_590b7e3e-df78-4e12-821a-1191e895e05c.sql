CREATE TABLE public.ss_reminder_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_type text NOT NULL UNIQUE,
  offsets_hours integer[] NOT NULL DEFAULT '{24,2}',
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ss_reminder_schedules TO authenticated;
GRANT ALL ON public.ss_reminder_schedules TO service_role;

ALTER TABLE public.ss_reminder_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view reminder schedules"
ON public.ss_reminder_schedules FOR SELECT TO authenticated
USING (public.ss_is_staff());

CREATE POLICY "Office can manage reminder schedules"
ON public.ss_reminder_schedules FOR ALL TO authenticated
USING (public.ss_is_office())
WITH CHECK (public.ss_is_office());

CREATE TRIGGER ss_reminder_schedules_updated_at
BEFORE UPDATE ON public.ss_reminder_schedules
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

INSERT INTO public.ss_reminder_schedules (appointment_type, offsets_hours) VALUES
  ('default', '{24,2}'),
  ('Chemical Only', '{24,2}'),
  ('Weekly Service', '{48,24,2}'),
  ('Swim Club', '{48,24,2}');