
CREATE TABLE public.ss_workflow_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  is_default boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ss_workflow_templates TO authenticated;
GRANT ALL ON public.ss_workflow_templates TO service_role;
ALTER TABLE public.ss_workflow_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "office manage workflow templates" ON public.ss_workflow_templates
  TO authenticated USING (public.ss_is_office()) WITH CHECK (public.ss_is_office());
CREATE POLICY "staff read workflow templates" ON public.ss_workflow_templates
  FOR SELECT TO authenticated USING (public.ss_is_staff());
CREATE TRIGGER ss_workflow_templates_updated BEFORE UPDATE ON public.ss_workflow_templates
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE public.ss_workflow_template_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.ss_workflow_templates(id) ON DELETE CASCADE,
  phase text NOT NULL DEFAULT 'in_progress' CHECK (phase IN ('arriving','in_progress','leaving')),
  label text NOT NULL,
  hint text,
  is_required boolean NOT NULL DEFAULT true,
  photo_required boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ss_workflow_template_steps_tpl_idx ON public.ss_workflow_template_steps (template_id, phase, sort_order);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ss_workflow_template_steps TO authenticated;
GRANT ALL ON public.ss_workflow_template_steps TO service_role;
ALTER TABLE public.ss_workflow_template_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "office manage workflow template steps" ON public.ss_workflow_template_steps
  TO authenticated USING (public.ss_is_office()) WITH CHECK (public.ss_is_office());
CREATE POLICY "staff read workflow template steps" ON public.ss_workflow_template_steps
  FOR SELECT TO authenticated USING (public.ss_is_staff());
CREATE TRIGGER ss_workflow_template_steps_updated BEFORE UPDATE ON public.ss_workflow_template_steps
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

ALTER TABLE public.ss_workflow_tasks
  ADD COLUMN IF NOT EXISTS phase text NOT NULL DEFAULT 'in_progress',
  ADD COLUMN IF NOT EXISTS hint text;
ALTER TABLE public.ss_workflow_tasks
  ADD CONSTRAINT ss_workflow_tasks_phase_chk CHECK (phase IN ('arriving','in_progress','leaving'));

ALTER TABLE public.ss_customers
  ADD COLUMN IF NOT EXISTS workflow_template_id uuid REFERENCES public.ss_workflow_templates(id) ON DELETE SET NULL;

WITH t AS (
  INSERT INTO public.ss_workflow_templates (name, description, is_default, sort_order)
  VALUES ('Standard pool service', 'Default arriving / in progress / leaving sequence for weekly service.', true, 0)
  RETURNING id
)
INSERT INTO public.ss_workflow_template_steps (template_id, phase, label, hint, is_required, photo_required, sort_order)
SELECT t.id, s.phase, s.label, s.hint, s.is_required, s.photo_required, s.sort_order FROM t, (VALUES
  ('arriving','Gate & access check','Confirm gate code, latch and pets before entering.',true,false,0),
  ('arriving','On-arrival photo','Wide shot of the pool as found.',true,true,1),
  ('arriving','Safety scan','Fencing, drain covers and equipment pad clear.',true,false,2),
  ('in_progress','Skim & debris sweep','Surface debris first.',true,false,0),
  ('in_progress','Baskets cleared','Skimmer and pump baskets emptied and rinsed.',true,false,1),
  ('in_progress','Brush walls & steps','Stop algae before it starts.',true,false,2),
  ('in_progress','Vacuum pass','Floor debris removed.',true,false,3),
  ('in_progress','Water test & balance','Readings logged, chemicals dosed to target.',true,false,4),
  ('in_progress','Filter care','Rinse or backwash on schedule.',true,false,5),
  ('in_progress','Equipment once-over','Pump, filter, heater and salt cell checked.',true,true,6),
  ('leaving','Final walk-around','Deck tidy, pad neat, tools loaded.',true,true,0),
  ('leaving','Gate secured','Latch closed and locked behind you.',true,false,1),
  ('leaving','Service snapshot sent','Notes and photos logged for the customer report.',true,false,2)
) AS s(phase,label,hint,is_required,photo_required,sort_order);
