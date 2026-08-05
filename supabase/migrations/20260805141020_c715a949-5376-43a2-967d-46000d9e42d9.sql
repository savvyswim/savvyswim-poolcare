CREATE TABLE IF NOT EXISTS public.ss_project_stage_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.ss_projects(id) ON DELETE CASCADE,
  stage_id uuid NOT NULL REFERENCES public.ss_project_stages(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'task',
  label text NOT NULL,
  doc_folder text,
  is_required boolean NOT NULL DEFAULT true,
  is_done boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ss_project_stage_tasks TO authenticated;
GRANT ALL ON public.ss_project_stage_tasks TO service_role;

ALTER TABLE public.ss_project_stage_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "office manage stage tasks" ON public.ss_project_stage_tasks
  FOR ALL TO authenticated
  USING (public.ss_is_office() OR private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.ss_is_office() OR private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "staff and customer read stage tasks" ON public.ss_project_stage_tasks
  FOR SELECT TO authenticated
  USING (project_id IN (
    SELECT p.id FROM public.ss_projects p
    WHERE p.customer_id = public.ss_my_customer_id()
       OR p.customer_id IN (
         SELECT c.id FROM public.ss_customers c WHERE c.assigned_tech_id = public.ss_my_staff_id()
       )
  ));

CREATE INDEX IF NOT EXISTS ss_project_stage_tasks_stage_idx
  ON public.ss_project_stage_tasks (stage_id, sort_order);

CREATE TRIGGER ss_project_stage_tasks_updated
  BEFORE UPDATE ON public.ss_project_stage_tasks
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE OR REPLACE FUNCTION public.ss_seed_stage_items(p_project uuid, p_stage uuid, p_name text)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  n text := lower(coalesce(p_name, ''));
  tasks text[] := ARRAY[]::text[];
  doc_labels text[] := ARRAY[]::text[];
  doc_folders text[] := ARRAY[]::text[];
  i integer;
BEGIN
  IF n LIKE '%contract%' OR n LIKE '%design%' THEN
    tasks := ARRAY['Scope & budget confirmed','Selections signed off','Deposit collected'];
    doc_labels := ARRAY['Signed contract','Plans & renderings','Certificate of insurance'];
    doc_folders := ARRAY['contracts','plans','insurance'];
  ELSIF n LIKE '%survey%' OR n LIKE '%scope%' THEN
    tasks := ARRAY['Site measured','Existing condition photos taken','Access & equipment noted'];
    doc_labels := ARRAY['Site survey notes'];
    doc_folders := ARRAY['plans'];
  ELSIF n LIKE '%permit%' THEN
    tasks := ARRAY['Application submitted','Permit fees paid','Permit card posted on site'];
    doc_labels := ARRAY['Approved permit','HOA / utility approval'];
    doc_folders := ARRAY['permits','hoa'];
  ELSIF n LIKE '%excavation%' OR n LIKE '%layout%' THEN
    tasks := ARRAY['Utility locate (811) called','Layout painted & owner approved','Dig depth verified','Spoil haul-off scheduled'];
    doc_labels := ARRAY['Utility locate ticket','Pre-dig / layout inspection'];
    doc_folders := ARRAY['hoa','inspections'];
  ELSIF n LIKE '%demo%' THEN
    tasks := ARRAY['Pool drained safely','Demo complete','Debris hauled off'];
  ELSIF n LIKE '%steel%' OR n LIKE '%plumbing%' THEN
    tasks := ARRAY['Rebar tied to spec','Plumbing pressure test passed','Bonding wire installed'];
    doc_labels := ARRAY['Pressure test report'];
    doc_folders := ARRAY['inspections'];
  ELSIF n LIKE '%gunite%' OR n LIKE '%shotcrete%' THEN
    tasks := ARRAY['Pre-gunite inspection passed','Shoot scheduled','Shell shot & shaped','Water cure started (7 days)'];
    doc_labels := ARRAY['Pre-gunite inspection report'];
    doc_folders := ARRAY['inspections'];
  ELSIF n LIKE '%surface prep%' THEN
    tasks := ARRAY['Chip-out complete','Bond coat applied'];
  ELSIF n LIKE '%tile%' OR n LIKE '%coping%' THEN
    tasks := ARRAY['Selections confirmed','Tile set','Coping set & grouted'];
    doc_labels := ARRAY['Material invoice'];
    doc_folders := ARRAY['invoices'];
  ELSIF n LIKE '%deck%' THEN
    tasks := ARRAY['Forms set & inspected','Concrete poured','Sealer applied'];
  ELSIF n LIKE '%equipment%' THEN
    tasks := ARRAY['Equipment pad set','Electrical bonded & inspected','Automation configured & tested'];
    doc_labels := ARRAY['Electrical inspection','Equipment warranties & manuals'];
    doc_folders := ARRAY['inspections','warranties'];
  ELSIF n LIKE '%plaster%' OR n LIKE '%interior finish%' OR n LIKE '%finish%' THEN
    tasks := ARRAY['Surface prep complete','Interior finish applied','Brush-out schedule set'];
    doc_labels := ARRAY['Interior finish warranty'];
    doc_folders := ARRAY['warranties'];
  ELSIF n LIKE '%fill%' OR n LIKE '%startup%' OR n LIKE '%start-up%' OR n LIKE '%handover%' THEN
    tasks := ARRAY['Pool filled','Start-up chemistry balanced','Owner walkthrough & training','Final invoice sent'];
    doc_labels := ARRAY['Final inspection','Warranty packet','Start-up water report'];
    doc_folders := ARRAY['inspections','warranties','other'];
  ELSIF n LIKE '%walkthrough%' OR n LIKE '%punch%' THEN
    tasks := ARRAY['Punch list cleared','Owner sign-off','Final invoice sent'];
    doc_labels := ARRAY['Owner sign-off'];
    doc_folders := ARRAY['contracts'];
  ELSE
    tasks := ARRAY['Work complete','Photos uploaded'];
  END IF;

  FOR i IN 1..coalesce(array_length(tasks, 1), 0) LOOP
    INSERT INTO public.ss_project_stage_tasks (project_id, stage_id, kind, label, sort_order)
    VALUES (p_project, p_stage, 'task', tasks[i], i);
  END LOOP;

  FOR i IN 1..coalesce(array_length(doc_labels, 1), 0) LOOP
    INSERT INTO public.ss_project_stage_tasks (project_id, stage_id, kind, label, doc_folder, sort_order)
    VALUES (p_project, p_stage, 'document', doc_labels[i], doc_folders[i], 100 + i);
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.ss_tg_seed_stage_items()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  PERFORM public.ss_seed_stage_items(NEW.project_id, NEW.id, NEW.name);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ss_project_stages_seed_items ON public.ss_project_stages;
CREATE TRIGGER ss_project_stages_seed_items
  AFTER INSERT ON public.ss_project_stages
  FOR EACH ROW EXECUTE FUNCTION public.ss_tg_seed_stage_items();

DO $$
DECLARE s record;
BEGIN
  FOR s IN SELECT id, project_id, name FROM public.ss_project_stages LOOP
    IF NOT EXISTS (SELECT 1 FROM public.ss_project_stage_tasks t WHERE t.stage_id = s.id) THEN
      PERFORM public.ss_seed_stage_items(s.project_id, s.id, s.name);
    END IF;
  END LOOP;
END $$;