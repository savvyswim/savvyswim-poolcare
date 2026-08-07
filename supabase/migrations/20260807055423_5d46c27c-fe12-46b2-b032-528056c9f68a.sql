-- 1. Reading fields ------------------------------------------------------
CREATE TABLE public.ss_reading_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  label text NOT NULL,
  unit text NOT NULL DEFAULT '',
  target_min numeric,
  target_max numeric,
  step numeric NOT NULL DEFAULT 1,
  purpose text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ss_reading_fields TO authenticated;
GRANT ALL ON public.ss_reading_fields TO service_role;
ALTER TABLE public.ss_reading_fields ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read reading fields" ON public.ss_reading_fields FOR SELECT TO authenticated USING (public.ss_is_staff());
CREATE POLICY "office manage reading fields" ON public.ss_reading_fields FOR ALL TO authenticated USING (public.ss_is_office()) WITH CHECK (public.ss_is_office());
CREATE TRIGGER ss_reading_fields_updated BEFORE UPDATE ON public.ss_reading_fields FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

INSERT INTO public.ss_reading_fields (key,label,unit,target_min,target_max,step,purpose,sort_order) VALUES
 ('fc','Free Cl','ppm',1,3,0.1,'Sanitation',1),
 ('ph','pH','',7.4,7.6,0.1,'Comfort & equipment',2),
 ('ta','Alkalinity','ppm',80,120,1,'Stability',3),
 ('ch','Hardness','ppm',200,400,1,'Surface protection',4),
 ('cyc','CYA','ppm',30,50,1,'Chlorine shield',5),
 ('psi','Filter PSI','psi',8,15,1,'Circulation',6),
 ('temp','Water Temp','°F',NULL,NULL,1,'LSI input',7),
 ('salt','Salt','ppm',3000,3400,10,'Cell output',8);

-- 2. Dosage products -----------------------------------------------------
CREATE TABLE public.ss_dosage_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  dose_key text NOT NULL,
  strength_pct numeric,
  unit text NOT NULL DEFAULT 'oz',
  cost_per_unit numeric(10,4) NOT NULL DEFAULT 0,
  is_default boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ss_dosage_products TO authenticated;
GRANT ALL ON public.ss_dosage_products TO service_role;
ALTER TABLE public.ss_dosage_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read dosage products" ON public.ss_dosage_products FOR SELECT TO authenticated USING (public.ss_is_staff());
CREATE POLICY "office manage dosage products" ON public.ss_dosage_products FOR ALL TO authenticated USING (public.ss_is_office()) WITH CHECK (public.ss_is_office());
CREATE TRIGGER ss_dosage_products_updated BEFORE UPDATE ON public.ss_dosage_products FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

INSERT INTO public.ss_dosage_products (name,dose_key,strength_pct,unit,cost_per_unit,is_default,sort_order) VALUES
 ('Liquid chlorine 12.5%','chlorine',12.5,'oz',0.05,true,1),
 ('Cal Hypo 73%','chlorine',73,'oz',0.09,false,2),
 ('Muriatic acid 31.45%','acid',31.45,'oz',0.045,true,3),
 ('Dry acid (sodium bisulfate)','acid',93,'oz',0.06,false,4),
 ('Soda ash','ph_up',100,'lb',1.45,true,5),
 ('Sodium bicarbonate','alkalinity_up',100,'lb',1.10,true,6),
 ('Calcium chloride flake 77%','hardness_up',77,'lb',1.35,true,7),
 ('Cyanuric acid','cya_up',100,'lb',3.20,true,8),
 ('Pool salt','salt_up',100,'lb',0.18,true,9);

-- 3. Checklist items -----------------------------------------------------
CREATE TABLE public.ss_checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  hint text,
  is_required boolean NOT NULL DEFAULT true,
  photo text NOT NULL DEFAULT 'none',
  plan_id text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ss_checklist_items TO authenticated;
GRANT ALL ON public.ss_checklist_items TO service_role;
ALTER TABLE public.ss_checklist_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read checklist items" ON public.ss_checklist_items FOR SELECT TO authenticated USING (public.ss_is_staff());
CREATE POLICY "office manage checklist items" ON public.ss_checklist_items FOR ALL TO authenticated USING (public.ss_is_office()) WITH CHECK (public.ss_is_office());
CREATE TRIGGER ss_checklist_items_updated BEFORE UPDATE ON public.ss_checklist_items FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

INSERT INTO public.ss_checklist_items (label,hint,is_required,photo,sort_order) VALUES
 ('Property check-in','Confirm gate code/access, note pets or obstacles, greet the homeowner if present.',true,'none',1),
 ('Safety scan','Gate latch, fencing and drain covers secure before any work starts.',true,'suggested',2),
 ('Debris sweep','Skim leaves and surface debris first.',true,'none',3),
 ('Basket & skimmer clear-out','Empty and rinse skimmer and pump baskets.',true,'suggested',4),
 ('Brush down','Brush walls, steps and corners to stop algae early.',true,'none',5),
 ('Vacuum pass','Vacuum floor debris for a visibly clean finish.',true,'suggested',6),
 ('Water test','Chlorine, pH and alkalinity measured on site (entered on step 1).',true,'none',7),
 ('Balance & treat','Add the chemicals needed to bring water into target range.',true,'none',8),
 ('Equipment once-over','Visual check of pump, filter, heater and salt cell for leaks or wear.',true,'required',9),
 ('Filter care','Rinse or backwash the filter on schedule.',true,'suggested',10),
 ('Chemical & supply check','Note truck inventory levels so nothing runs short on the next stop.',true,'none',11),
 ('Spot the opportunity','Flag any repair, upgrade or add-on worth mentioning — use the issue box on wrap-up.',false,'suggested',12),
 ('Final walk-around','Pool area tidy, equipment pad neat, gate secured.',true,'required',13),
 ('Digital service snapshot','Visit notes and photos logged in the customer report.',true,'none',14),
 ('Customer follow-up note','Send a quick arrival/completion message if the homeowner isn''t on site.',false,'none',15);

-- 4. Work order types ----------------------------------------------------
CREATE TABLE public.ss_work_order_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  color text NOT NULL DEFAULT '#1FA9BE',
  default_price numeric(10,2) NOT NULL DEFAULT 0,
  default_minutes integer NOT NULL DEFAULT 60,
  default_checklist jsonb NOT NULL DEFAULT '[]'::jsonb,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ss_work_order_types TO authenticated;
GRANT ALL ON public.ss_work_order_types TO service_role;
ALTER TABLE public.ss_work_order_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read work order types" ON public.ss_work_order_types FOR SELECT TO authenticated USING (public.ss_is_staff());
CREATE POLICY "office manage work order types" ON public.ss_work_order_types FOR ALL TO authenticated USING (public.ss_is_office()) WITH CHECK (public.ss_is_office());
CREATE TRIGGER ss_work_order_types_updated BEFORE UPDATE ON public.ss_work_order_types FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

INSERT INTO public.ss_work_order_types (name,color,default_price,default_minutes,default_checklist,description,sort_order) VALUES
 ('Service Call','#1FA9BE',125,60,'["Diagnose issue","Photo of problem area","Explain findings to customer"]'::jsonb,'Diagnostic visit for a reported problem',1),
 ('Repair','#8E1F2C',0,120,'["Photo before repair","Replace/repair part","Test system","Photo after repair"]'::jsonb,'Parts and labor repair work',2),
 ('Filter Clean','#4C9A57',180,90,'["Photo of dirty cartridges","Deep clean elements","Reassemble & pressure test"]'::jsonb,'Full filter teardown and clean',3),
 ('Pool Open','#E08A2B',350,150,'["Remove & store cover","Reinstall equipment","Start-up chemistry"]'::jsonb,'Seasonal pool opening',4),
 ('Pool Close','#3C5A73',350,150,'["Balance for winter","Blow out lines","Install cover"]'::jsonb,'Seasonal pool closing',5),
 ('Green-to-Clean','#5A6B46',0,240,'["Before photo","Shock treatment","Vacuum to waste","Filter clean","After photo"]'::jsonb,'Neglected pool recovery',6);

ALTER TABLE public.ss_jobs ADD COLUMN IF NOT EXISTS work_order_type_id uuid REFERENCES public.ss_work_order_types(id) ON DELETE SET NULL;

-- 5. Bodies of water -----------------------------------------------------
CREATE TABLE public.ss_water_bodies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.ss_customers(id) ON DELETE CASCADE,
  name text NOT NULL,
  kind text NOT NULL DEFAULT 'pool',
  gallons integer NOT NULL DEFAULT 0,
  surface text,
  sanitizer text,
  notes text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ss_water_bodies_customer_idx ON public.ss_water_bodies(customer_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ss_water_bodies TO authenticated;
GRANT ALL ON public.ss_water_bodies TO service_role;
ALTER TABLE public.ss_water_bodies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read water bodies" ON public.ss_water_bodies FOR SELECT TO authenticated USING (public.ss_is_staff());
CREATE POLICY "office manage water bodies" ON public.ss_water_bodies FOR ALL TO authenticated USING (public.ss_is_office()) WITH CHECK (public.ss_is_office());
CREATE POLICY "customer reads own water bodies" ON public.ss_water_bodies FOR SELECT TO authenticated USING (customer_id = public.ss_my_customer_id());
CREATE TRIGGER ss_water_bodies_updated BEFORE UPDATE ON public.ss_water_bodies FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Every existing pool becomes its primary body of water.
INSERT INTO public.ss_water_bodies (customer_id,name,kind,gallons,surface,sanitizer,sort_order)
SELECT id, 'Pool', 'pool', COALESCE(gallons,0), NULL, pool_type, 1 FROM public.ss_customers;

ALTER TABLE public.ss_visits ADD COLUMN IF NOT EXISTS water_body_id uuid REFERENCES public.ss_water_bodies(id) ON DELETE SET NULL;

-- 6. Customer record depth ----------------------------------------------
ALTER TABLE public.ss_customers
  ADD COLUMN IF NOT EXISTS customer_code text,
  ADD COLUMN IF NOT EXISTS location_code text,
  ADD COLUMN IF NOT EXISTS dog_name text,
  ADD COLUMN IF NOT EXISTS minutes_at_stop integer,
  ADD COLUMN IF NOT EXISTS location_notes text,
  ADD COLUMN IF NOT EXISTS rate_type text,
  ADD COLUMN IF NOT EXISTS labor_cost_type text,
  ADD COLUMN IF NOT EXISTS phones jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS emails jsonb NOT NULL DEFAULT '[]'::jsonb;