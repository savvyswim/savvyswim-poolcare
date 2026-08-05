-- ============ ENUMS ============
CREATE TYPE public.ss_level AS ENUM ('owner','office_manager','technician');
CREATE TYPE public.ss_stage AS ENUM ('new_lead','contacted','quote_sent','follow_up','won','lost');
CREATE TYPE public.ss_cust_status AS ENUM ('active','inactive');

-- ============ STAFF ============
CREATE TABLE public.ss_staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE,
  full_name text NOT NULL,
  email text,
  phone text,
  level public.ss_level NOT NULL DEFAULT 'technician',
  initials text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ss_staff TO authenticated;
GRANT ALL ON public.ss_staff TO service_role;
ALTER TABLE public.ss_staff ENABLE ROW LEVEL SECURITY;

-- helper functions (security definer, no recursion)
CREATE OR REPLACE FUNCTION public.ss_my_level(_uid uuid)
RETURNS public.ss_level LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT level FROM public.ss_staff WHERE user_id = _uid AND is_active LIMIT 1
$$;
REVOKE EXECUTE ON FUNCTION public.ss_my_level(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ss_my_level(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.ss_is_owner()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.ss_my_level(auth.uid()) = 'owner'
$$;
REVOKE EXECUTE ON FUNCTION public.ss_is_owner() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ss_is_owner() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.ss_is_office()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.ss_my_level(auth.uid()) IN ('owner','office_manager')
$$;
REVOKE EXECUTE ON FUNCTION public.ss_is_office() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ss_is_office() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.ss_is_staff()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.ss_my_level(auth.uid()) IS NOT NULL
$$;
REVOKE EXECUTE ON FUNCTION public.ss_is_staff() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ss_is_staff() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.ss_my_staff_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.ss_staff WHERE user_id = auth.uid() LIMIT 1
$$;
REVOKE EXECUTE ON FUNCTION public.ss_my_staff_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ss_my_staff_id() TO authenticated, service_role;

CREATE POLICY "staff read roster" ON public.ss_staff FOR SELECT TO authenticated
  USING (public.ss_is_staff());
CREATE POLICY "office manage roster" ON public.ss_staff FOR ALL TO authenticated
  USING (public.ss_is_office()) WITH CHECK (public.ss_is_office());

-- ============ CUSTOMERS ============
CREATE TABLE public.ss_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  full_name text NOT NULL,
  address text,
  city text,
  state text NOT NULL DEFAULT 'TX',
  postal_code text,
  lat numeric,
  lng numeric,
  phone text,
  email text,
  status public.ss_cust_status NOT NULL DEFAULT 'active',
  service_level text NOT NULL DEFAULT 'Savvy Signature',
  pool_type text NOT NULL DEFAULT 'Standard',
  gallons integer NOT NULL DEFAULT 15000,
  equipment jsonb NOT NULL DEFAULT '{"filter":"cartridge","pump":"variable","sanitizer":"chlorinator","heater":false}'::jsonb,
  gate_code text,
  internal_notes text,
  custom_fields jsonb NOT NULL DEFAULT '{}'::jsonb,
  route_frequency text NOT NULL DEFAULT 'weekly',
  route_day text,
  assigned_tech_id uuid REFERENCES public.ss_staff(id) ON DELETE SET NULL,
  charge_for_chems boolean NOT NULL DEFAULT false,
  billing_mode text NOT NULL DEFAULT 'flat',
  billing_timing text NOT NULL DEFAULT 'advance',
  invoice_day integer NOT NULL DEFAULT 1,
  monthly_price numeric(10,2) NOT NULL DEFAULT 0,
  referral_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ss_customers TO authenticated;
GRANT ALL ON public.ss_customers TO service_role;
ALTER TABLE public.ss_customers ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.ss_my_customer_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.ss_customers WHERE user_id = auth.uid() LIMIT 1
$$;
REVOKE EXECUTE ON FUNCTION public.ss_my_customer_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ss_my_customer_id() TO authenticated, service_role;

CREATE POLICY "office manage customers" ON public.ss_customers FOR ALL TO authenticated
  USING (public.ss_is_office()) WITH CHECK (public.ss_is_office());
CREATE POLICY "tech reads assigned customers" ON public.ss_customers FOR SELECT TO authenticated
  USING (assigned_tech_id = public.ss_my_staff_id());

-- customer-portal safe projection (never exposes internal_notes)
CREATE OR REPLACE FUNCTION public.ss_my_pool()
RETURNS TABLE (
  id uuid, full_name text, address text, city text, service_level text,
  pool_type text, gallons integer, route_day text, monthly_price numeric,
  referral_code text, status public.ss_cust_status
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.id, c.full_name, c.address, c.city, c.service_level, c.pool_type,
         c.gallons, c.route_day, c.monthly_price, c.referral_code, c.status
  FROM public.ss_customers c WHERE c.user_id = auth.uid()
$$;
REVOKE EXECUTE ON FUNCTION public.ss_my_pool() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ss_my_pool() TO authenticated, service_role;

-- ============ CUSTOM FIELD DEFS ============
CREATE TABLE public.ss_custom_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  field_type text NOT NULL DEFAULT 'boolean',
  is_warning boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ss_custom_fields TO authenticated;
GRANT ALL ON public.ss_custom_fields TO service_role;
ALTER TABLE public.ss_custom_fields ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read fields" ON public.ss_custom_fields FOR SELECT TO authenticated USING (public.ss_is_staff());
CREATE POLICY "office manage fields" ON public.ss_custom_fields FOR ALL TO authenticated
  USING (public.ss_is_office()) WITH CHECK (public.ss_is_office());

-- ============ WORKFLOW TASKS ============
CREATE TABLE public.ss_workflow_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.ss_customers(id) ON DELETE CASCADE,
  label text NOT NULL,
  is_required boolean NOT NULL DEFAULT false,
  photo_required boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ss_workflow_tasks TO authenticated;
GRANT ALL ON public.ss_workflow_tasks TO service_role;
ALTER TABLE public.ss_workflow_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "office manage workflow" ON public.ss_workflow_tasks FOR ALL TO authenticated
  USING (public.ss_is_office()) WITH CHECK (public.ss_is_office());
CREATE POLICY "tech reads workflow" ON public.ss_workflow_tasks FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.ss_customers c WHERE c.id = customer_id AND c.assigned_tech_id = public.ss_my_staff_id()));

-- ============ LEADS / PIPELINE ============
CREATE TABLE public.ss_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  phone text,
  email text,
  address text,
  city text,
  stage public.ss_stage NOT NULL DEFAULT 'new_lead',
  monthly_value numeric(10,2) NOT NULL DEFAULT 0,
  pool_size text,
  condition text NOT NULL DEFAULT 'clean',
  spa_option text NOT NULL DEFAULT 'none',
  spa_addon numeric(10,2) NOT NULL DEFAULT 0,
  service_type text NOT NULL DEFAULT 'full',
  cleanup_price numeric(10,2),
  photo_url text,
  message text,
  source text NOT NULL DEFAULT 'website',
  stage_changed_at timestamptz NOT NULL DEFAULT now(),
  converted_customer_id uuid REFERENCES public.ss_customers(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ss_leads TO authenticated;
GRANT INSERT ON public.ss_leads TO anon;
GRANT ALL ON public.ss_leads TO service_role;
ALTER TABLE public.ss_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public submits quote" ON public.ss_leads FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "office manage leads" ON public.ss_leads FOR SELECT TO authenticated USING (public.ss_is_office());
CREATE POLICY "office updates leads" ON public.ss_leads FOR UPDATE TO authenticated
  USING (public.ss_is_office()) WITH CHECK (public.ss_is_office());
CREATE POLICY "office deletes leads" ON public.ss_leads FOR DELETE TO authenticated USING (public.ss_is_office());

-- ============ VISITS ============
CREATE TABLE public.ss_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.ss_customers(id) ON DELETE CASCADE,
  tech_id uuid REFERENCES public.ss_staff(id) ON DELETE SET NULL,
  scheduled_date date NOT NULL DEFAULT CURRENT_DATE,
  stop_order integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  en_route_at timestamptz,
  arrived_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  minutes_on_site integer,
  readings jsonb NOT NULL DEFAULT '{}'::jsonb,
  dosing jsonb NOT NULL DEFAULT '{}'::jsonb,
  chem_cost numeric(10,2) NOT NULL DEFAULT 0,
  checklist jsonb NOT NULL DEFAULT '[]'::jsonb,
  before_photo_url text,
  after_photo_url text,
  notes text,
  issue_reported text,
  feedback text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ss_visits TO authenticated;
GRANT ALL ON public.ss_visits TO service_role;
ALTER TABLE public.ss_visits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "office manage visits" ON public.ss_visits FOR ALL TO authenticated
  USING (public.ss_is_office()) WITH CHECK (public.ss_is_office());
CREATE POLICY "tech reads own visits" ON public.ss_visits FOR SELECT TO authenticated
  USING (tech_id = public.ss_my_staff_id());
CREATE POLICY "tech updates own visits" ON public.ss_visits FOR UPDATE TO authenticated
  USING (tech_id = public.ss_my_staff_id()) WITH CHECK (tech_id = public.ss_my_staff_id());
CREATE POLICY "customer reads own visits" ON public.ss_visits FOR SELECT TO authenticated
  USING (customer_id = public.ss_my_customer_id());

-- ============ PRICE BOOK / BUNDLES / JOBS ============
CREATE TABLE public.ss_price_book (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  price numeric(10,2) NOT NULL DEFAULT 0,
  category text NOT NULL DEFAULT 'job',
  recurs_days integer,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ss_price_book TO authenticated;
GRANT ALL ON public.ss_price_book TO service_role;
ALTER TABLE public.ss_price_book ENABLE ROW LEVEL SECURITY;
CREATE POLICY "office reads price book" ON public.ss_price_book FOR SELECT TO authenticated USING (public.ss_is_office());
CREATE POLICY "owner manages price book" ON public.ss_price_book FOR ALL TO authenticated
  USING (public.ss_is_owner()) WITH CHECK (public.ss_is_owner());

CREATE TABLE public.ss_bundles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  price numeric(10,2) NOT NULL DEFAULT 0,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ss_bundles TO authenticated;
GRANT ALL ON public.ss_bundles TO service_role;
ALTER TABLE public.ss_bundles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "office reads bundles" ON public.ss_bundles FOR SELECT TO authenticated USING (public.ss_is_office());
CREATE POLICY "owner manages bundles" ON public.ss_bundles FOR ALL TO authenticated
  USING (public.ss_is_owner()) WITH CHECK (public.ss_is_owner());

CREATE TABLE public.ss_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.ss_customers(id) ON DELETE CASCADE,
  tech_id uuid REFERENCES public.ss_staff(id) ON DELETE SET NULL,
  title text NOT NULL,
  details text,
  price numeric(10,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'open',
  due_date date,
  completed_at timestamptz,
  auto_flag_source text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ss_jobs TO authenticated;
GRANT ALL ON public.ss_jobs TO service_role;
ALTER TABLE public.ss_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "office manage jobs" ON public.ss_jobs FOR ALL TO authenticated
  USING (public.ss_is_office()) WITH CHECK (public.ss_is_office());
CREATE POLICY "tech reads own jobs" ON public.ss_jobs FOR SELECT TO authenticated
  USING (tech_id = public.ss_my_staff_id());
CREATE POLICY "customer reads own jobs" ON public.ss_jobs FOR SELECT TO authenticated
  USING (customer_id = public.ss_my_customer_id());

-- ============ FINANCE (owner only) ============
CREATE TABLE public.ss_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.ss_customers(id) ON DELETE CASCADE,
  invoice_number text NOT NULL DEFAULT ('SS-' || to_char(now(),'YYMM') || '-' || substr(gen_random_uuid()::text,1,5)),
  amount numeric(10,2) NOT NULL DEFAULT 0,
  kind text NOT NULL DEFAULT 'recurring',
  status text NOT NULL DEFAULT 'not_paid',
  issued_on date NOT NULL DEFAULT CURRENT_DATE,
  due_date date,
  paid_at timestamptz,
  stripe_payment_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ss_invoices TO authenticated;
GRANT ALL ON public.ss_invoices TO service_role;
ALTER TABLE public.ss_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner manages invoices" ON public.ss_invoices FOR ALL TO authenticated
  USING (public.ss_is_owner()) WITH CHECK (public.ss_is_owner());
CREATE POLICY "customer reads own invoices" ON public.ss_invoices FOR SELECT TO authenticated
  USING (customer_id = public.ss_my_customer_id());

CREATE TABLE public.ss_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid REFERENCES public.ss_invoices(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES public.ss_customers(id) ON DELETE SET NULL,
  amount numeric(10,2) NOT NULL,
  kind text NOT NULL DEFAULT 'applied',
  method text NOT NULL DEFAULT 'manual',
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ss_payments TO authenticated;
GRANT ALL ON public.ss_payments TO service_role;
ALTER TABLE public.ss_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner manages payments" ON public.ss_payments FOR ALL TO authenticated
  USING (public.ss_is_owner()) WITH CHECK (public.ss_is_owner());

CREATE TABLE public.ss_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL DEFAULT 'Other',
  vendor text,
  description text,
  amount numeric(10,2) NOT NULL DEFAULT 0,
  spent_on date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ss_expenses TO authenticated;
GRANT ALL ON public.ss_expenses TO service_role;
ALTER TABLE public.ss_expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner manages expenses" ON public.ss_expenses FOR ALL TO authenticated
  USING (public.ss_is_owner()) WITH CHECK (public.ss_is_owner());

CREATE TABLE public.ss_purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  total numeric(10,2) NOT NULL DEFAULT 0,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  ordered_at timestamptz,
  received_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ss_purchase_orders TO authenticated;
GRANT ALL ON public.ss_purchase_orders TO service_role;
ALTER TABLE public.ss_purchase_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner manages pos" ON public.ss_purchase_orders FOR ALL TO authenticated
  USING (public.ss_is_owner()) WITH CHECK (public.ss_is_owner());

-- ============ INVENTORY / TRUCKS ============
CREATE TABLE public.ss_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  unit text NOT NULL DEFAULT 'ea',
  quantity numeric(10,2) NOT NULL DEFAULT 0,
  low_threshold numeric(10,2) NOT NULL DEFAULT 5,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ss_inventory TO authenticated;
GRANT ALL ON public.ss_inventory TO service_role;
ALTER TABLE public.ss_inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read inventory" ON public.ss_inventory FOR SELECT TO authenticated USING (public.ss_is_staff());
CREATE POLICY "office manage inventory" ON public.ss_inventory FOR ALL TO authenticated
  USING (public.ss_is_office()) WITH CHECK (public.ss_is_office());

CREATE TABLE public.ss_trucks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  assigned_tech_id uuid REFERENCES public.ss_staff(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ss_trucks TO authenticated;
GRANT ALL ON public.ss_trucks TO service_role;
ALTER TABLE public.ss_trucks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read trucks" ON public.ss_trucks FOR SELECT TO authenticated USING (public.ss_is_staff());
CREATE POLICY "office manage trucks" ON public.ss_trucks FOR ALL TO authenticated
  USING (public.ss_is_office()) WITH CHECK (public.ss_is_office());

CREATE TABLE public.ss_truck_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  truck_id uuid NOT NULL REFERENCES public.ss_trucks(id) ON DELETE CASCADE,
  label text NOT NULL,
  is_stocked boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ss_truck_items TO authenticated;
GRANT ALL ON public.ss_truck_items TO service_role;
ALTER TABLE public.ss_truck_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read truck items" ON public.ss_truck_items FOR SELECT TO authenticated USING (public.ss_is_staff());
CREATE POLICY "staff update truck items" ON public.ss_truck_items FOR UPDATE TO authenticated
  USING (public.ss_is_staff()) WITH CHECK (public.ss_is_staff());
CREATE POLICY "office manage truck items" ON public.ss_truck_items FOR ALL TO authenticated
  USING (public.ss_is_office()) WITH CHECK (public.ss_is_office());

-- ============ ALERTS / FEED / EMAIL ============
CREATE TABLE public.ss_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES public.ss_customers(id) ON DELETE CASCADE,
  tech_id uuid REFERENCES public.ss_staff(id) ON DELETE SET NULL,
  priority text NOT NULL DEFAULT 'MED',
  title text NOT NULL,
  body text,
  is_resolved boolean NOT NULL DEFAULT false,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ss_alerts TO authenticated;
GRANT ALL ON public.ss_alerts TO service_role;
ALTER TABLE public.ss_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "office manage alerts" ON public.ss_alerts FOR ALL TO authenticated
  USING (public.ss_is_office()) WITH CHECK (public.ss_is_office());
CREATE POLICY "tech creates alerts" ON public.ss_alerts FOR INSERT TO authenticated
  WITH CHECK (tech_id = public.ss_my_staff_id());

CREATE TABLE public.ss_feed (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.ss_customers(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'update',
  title text NOT NULL,
  body text,
  sent_by_sms boolean NOT NULL DEFAULT false,
  visit_id uuid REFERENCES public.ss_visits(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ss_feed TO authenticated;
GRANT ALL ON public.ss_feed TO service_role;
ALTER TABLE public.ss_feed ENABLE ROW LEVEL SECURITY;
CREATE POLICY "office manage feed" ON public.ss_feed FOR ALL TO authenticated
  USING (public.ss_is_office()) WITH CHECK (public.ss_is_office());
CREATE POLICY "tech writes feed" ON public.ss_feed FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.ss_customers c WHERE c.id = customer_id AND c.assigned_tech_id = public.ss_my_staff_id()));
CREATE POLICY "customer reads own feed" ON public.ss_feed FOR SELECT TO authenticated
  USING (customer_id = public.ss_my_customer_id());

CREATE TABLE public.ss_broadcasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject text NOT NULL,
  body text NOT NULL,
  segment text NOT NULL DEFAULT 'all_active',
  recipient_count integer NOT NULL DEFAULT 0,
  channels jsonb NOT NULL DEFAULT '["email","sms","app"]'::jsonb,
  sent_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ss_broadcasts TO authenticated;
GRANT ALL ON public.ss_broadcasts TO service_role;
ALTER TABLE public.ss_broadcasts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "office manage broadcasts" ON public.ss_broadcasts FOR ALL TO authenticated
  USING (public.ss_is_office()) WITH CHECK (public.ss_is_office());

CREATE TABLE public.ss_suppression (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  reason text NOT NULL DEFAULT 'opt_out',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ss_suppression TO authenticated;
GRANT ALL ON public.ss_suppression TO service_role;
ALTER TABLE public.ss_suppression ENABLE ROW LEVEL SECURITY;
CREATE POLICY "office manage suppression" ON public.ss_suppression FOR ALL TO authenticated
  USING (public.ss_is_office()) WITH CHECK (public.ss_is_office());

-- ============ SETTINGS ============
CREATE TABLE public.ss_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ss_settings TO authenticated;
GRANT ALL ON public.ss_settings TO service_role;
ALTER TABLE public.ss_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read settings" ON public.ss_settings FOR SELECT TO authenticated USING (public.ss_is_staff());
CREATE POLICY "owner manages settings" ON public.ss_settings FOR ALL TO authenticated
  USING (public.ss_is_owner()) WITH CHECK (public.ss_is_owner());

-- ============ updated_at triggers ============
CREATE TRIGGER ss_staff_updated BEFORE UPDATE ON public.ss_staff FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER ss_customers_updated BEFORE UPDATE ON public.ss_customers FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER ss_leads_updated BEFORE UPDATE ON public.ss_leads FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER ss_visits_updated BEFORE UPDATE ON public.ss_visits FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER ss_jobs_updated BEFORE UPDATE ON public.ss_jobs FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER ss_invoices_updated BEFORE UPDATE ON public.ss_invoices FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER ss_price_book_updated BEFORE UPDATE ON public.ss_price_book FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER ss_bundles_updated BEFORE UPDATE ON public.ss_bundles FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER ss_inventory_updated BEFORE UPDATE ON public.ss_inventory FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER ss_po_updated BEFORE UPDATE ON public.ss_purchase_orders FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- keep stage_changed_at fresh
CREATE OR REPLACE FUNCTION public.ss_tg_stage_changed()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.stage IS DISTINCT FROM OLD.stage THEN NEW.stage_changed_at = now(); END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER ss_leads_stage BEFORE UPDATE ON public.ss_leads FOR EACH ROW EXECUTE FUNCTION public.ss_tg_stage_changed();

CREATE INDEX ss_visits_route_idx ON public.ss_visits (scheduled_date, tech_id, stop_order);
CREATE INDEX ss_customers_status_idx ON public.ss_customers (status, assigned_tech_id);
CREATE INDEX ss_feed_customer_idx ON public.ss_feed (customer_id, created_at DESC);