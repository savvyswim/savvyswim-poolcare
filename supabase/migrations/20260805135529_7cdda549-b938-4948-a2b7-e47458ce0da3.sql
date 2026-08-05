
CREATE TABLE public.ss_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES public.ss_customers(id) ON DELETE SET NULL,
  lead_id uuid REFERENCES public.ss_leads(id) ON DELETE SET NULL,
  title text NOT NULL,
  kind text NOT NULL DEFAULT 'construction',
  status text NOT NULL DEFAULT 'planning',
  address text,
  city text,
  budget_low numeric(12,2),
  budget_high numeric(12,2),
  start_date date,
  target_date date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.ss_project_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.ss_projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  notes text,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.ss_project_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.ss_projects(id) ON DELETE CASCADE,
  stage_id uuid REFERENCES public.ss_project_stages(id) ON DELETE SET NULL,
  design_id uuid REFERENCES public.pool_designs(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  storage_path text NOT NULL,
  media_type text NOT NULL DEFAULT 'image',
  size_bytes bigint,
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ss_project_stages_project_idx ON public.ss_project_stages(project_id, sort_order);
CREATE INDEX ss_project_files_project_idx ON public.ss_project_files(project_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ss_projects TO authenticated;
GRANT ALL ON public.ss_projects TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ss_project_stages TO authenticated;
GRANT ALL ON public.ss_project_stages TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ss_project_files TO authenticated;
GRANT ALL ON public.ss_project_files TO service_role;

ALTER TABLE public.ss_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ss_project_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ss_project_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "office manage projects" ON public.ss_projects FOR ALL TO authenticated
  USING (public.ss_is_office() OR private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.ss_is_office() OR private.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "tech reads assigned projects" ON public.ss_projects FOR SELECT TO authenticated
  USING (customer_id IN (SELECT id FROM public.ss_customers WHERE assigned_tech_id = public.ss_my_staff_id()));
CREATE POLICY "customer reads own project" ON public.ss_projects FOR SELECT TO authenticated
  USING (customer_id = public.ss_my_customer_id());

CREATE POLICY "office manage project stages" ON public.ss_project_stages FOR ALL TO authenticated
  USING (public.ss_is_office() OR private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.ss_is_office() OR private.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "staff and customer read project stages" ON public.ss_project_stages FOR SELECT TO authenticated
  USING (project_id IN (
    SELECT p.id FROM public.ss_projects p
    WHERE p.customer_id = public.ss_my_customer_id()
       OR p.customer_id IN (SELECT c.id FROM public.ss_customers c WHERE c.assigned_tech_id = public.ss_my_staff_id())
  ));

CREATE POLICY "office manage project files" ON public.ss_project_files FOR ALL TO authenticated
  USING (public.ss_is_office() OR private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.ss_is_office() OR private.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "staff and customer read project files" ON public.ss_project_files FOR SELECT TO authenticated
  USING (project_id IN (
    SELECT p.id FROM public.ss_projects p
    WHERE p.customer_id = public.ss_my_customer_id()
       OR p.customer_id IN (SELECT c.id FROM public.ss_customers c WHERE c.assigned_tech_id = public.ss_my_staff_id())
  ));

CREATE TRIGGER ss_projects_updated BEFORE UPDATE ON public.ss_projects
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER ss_project_stages_updated BEFORE UPDATE ON public.ss_project_stages
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE OR REPLACE FUNCTION public.ss_tg_seed_project_stages()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  names text[];
  i integer;
BEGIN
  IF NEW.kind = 'remodel' THEN
    names := ARRAY['Site survey & scope','Design & selections','Permits','Demo & drain','Surface prep','Tile & coping','Plaster / finish','Equipment upgrade','Fill & startup','Final walkthrough'];
  ELSE
    names := ARRAY['Design & contract','Permits & approvals','Layout & excavation','Steel & plumbing','Gunite / shotcrete','Tile & coping','Decking','Equipment set','Interior finish','Fill, startup & handover'];
  END IF;
  FOR i IN 1..array_length(names,1) LOOP
    INSERT INTO public.ss_project_stages (project_id, name, sort_order)
    VALUES (NEW.id, names[i], i);
  END LOOP;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.ss_tg_seed_project_stages() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER ss_projects_seed_stages AFTER INSERT ON public.ss_projects
  FOR EACH ROW EXECUTE FUNCTION public.ss_tg_seed_project_stages();
