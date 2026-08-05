-- ============ PRICING ============
CREATE TABLE public.ss_city_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city text NOT NULL UNIQUE,
  low numeric(10,2) NOT NULL DEFAULT 0,
  high numeric(10,2) NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ss_city_rates TO authenticated;
GRANT SELECT ON public.ss_city_rates TO anon;
GRANT ALL ON public.ss_city_rates TO service_role;
ALTER TABLE public.ss_city_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "city rates readable" ON public.ss_city_rates FOR SELECT USING (true);
CREATE POLICY "owner manages city rates" ON public.ss_city_rates FOR ALL TO authenticated
  USING (public.ss_is_owner()) WITH CHECK (public.ss_is_owner());
CREATE TRIGGER ss_city_rates_updated BEFORE UPDATE ON public.ss_city_rates
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE public.ss_addons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  label text NOT NULL,
  kind text NOT NULL DEFAULT 'flat',
  amount numeric(10,2) NOT NULL DEFAULT 0,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ss_addons TO authenticated;
GRANT SELECT ON public.ss_addons TO anon;
GRANT ALL ON public.ss_addons TO service_role;
ALTER TABLE public.ss_addons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "addons readable" ON public.ss_addons FOR SELECT USING (true);
CREATE POLICY "owner manages addons" ON public.ss_addons FOR ALL TO authenticated
  USING (public.ss_is_owner()) WITH CHECK (public.ss_is_owner());
CREATE TRIGGER ss_addons_updated BEFORE UPDATE ON public.ss_addons
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

ALTER TABLE public.ss_customers
  ADD COLUMN IF NOT EXISTS rate_override numeric(10,2),
  ADD COLUMN IF NOT EXISTS rate_override_note text,
  ADD COLUMN IF NOT EXISTS promo_code text,
  ADD COLUMN IF NOT EXISTS commitment_months integer,
  ADD COLUMN IF NOT EXISTS commitment_start date,
  ADD COLUMN IF NOT EXISTS commitment_end date;

ALTER TABLE public.ss_leads
  ADD COLUMN IF NOT EXISTS promo_code text,
  ADD COLUMN IF NOT EXISTS commitment_months integer;

-- ============ PROMO CODES ============
CREATE TABLE public.ss_promo_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  description text,
  discount_type text NOT NULL DEFAULT 'percent',
  value numeric(10,2) NOT NULL DEFAULT 0,
  applies_to text NOT NULL DEFAULT 'recurring',
  min_commitment_months integer NOT NULL DEFAULT 0,
  max_redemptions integer,
  times_used integer NOT NULL DEFAULT 0,
  expires_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ss_promo_codes TO authenticated;
GRANT SELECT ON public.ss_promo_codes TO anon;
GRANT ALL ON public.ss_promo_codes TO service_role;
ALTER TABLE public.ss_promo_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "promo codes readable" ON public.ss_promo_codes FOR SELECT USING (is_active = true OR public.ss_is_office());
CREATE POLICY "office manages promo codes" ON public.ss_promo_codes FOR ALL TO authenticated
  USING (public.ss_is_office()) WITH CHECK (public.ss_is_office());
CREATE TRIGGER ss_promo_codes_updated BEFORE UPDATE ON public.ss_promo_codes
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE public.ss_promo_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  promo_id uuid REFERENCES public.ss_promo_codes(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES public.ss_customers(id) ON DELETE SET NULL,
  lead_id uuid REFERENCES public.ss_leads(id) ON DELETE SET NULL,
  commitment_months integer,
  monthly_before numeric(10,2),
  monthly_after numeric(10,2),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ss_promo_redemptions TO authenticated;
GRANT ALL ON public.ss_promo_redemptions TO service_role;
ALTER TABLE public.ss_promo_redemptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "office reads redemptions" ON public.ss_promo_redemptions FOR SELECT TO authenticated USING (public.ss_is_office());
CREATE POLICY "office writes redemptions" ON public.ss_promo_redemptions FOR ALL TO authenticated
  USING (public.ss_is_office()) WITH CHECK (public.ss_is_office());

-- ============ CONTRACTS ============
CREATE TABLE public.ss_contract_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  body text NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ss_contract_templates TO authenticated;
GRANT ALL ON public.ss_contract_templates TO service_role;
ALTER TABLE public.ss_contract_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "office manages templates" ON public.ss_contract_templates FOR ALL TO authenticated
  USING (public.ss_is_office()) WITH CHECK (public.ss_is_office());
CREATE TRIGGER ss_contract_templates_updated BEFORE UPDATE ON public.ss_contract_templates
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE public.ss_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES public.ss_customers(id) ON DELETE SET NULL,
  lead_id uuid REFERENCES public.ss_leads(id) ON DELETE SET NULL,
  template_id uuid REFERENCES public.ss_contract_templates(id) ON DELETE SET NULL,
  title text NOT NULL,
  body text NOT NULL,
  merge_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft',
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  recipient_name text,
  recipient_email text,
  recipient_phone text,
  sent_at timestamptz,
  viewed_at timestamptz,
  signed_at timestamptz,
  declined_at timestamptz,
  voided_at timestamptz,
  signer_name text,
  signature_data_url text,
  signer_ip text,
  signer_user_agent text,
  pdf_path text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ss_contracts TO authenticated;
GRANT ALL ON public.ss_contracts TO service_role;
ALTER TABLE public.ss_contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "office manages contracts" ON public.ss_contracts FOR ALL TO authenticated
  USING (public.ss_is_office()) WITH CHECK (public.ss_is_office());
CREATE POLICY "customers read own contracts" ON public.ss_contracts FOR SELECT TO authenticated
  USING (customer_id = public.ss_my_customer_id());
CREATE TRIGGER ss_contracts_updated BEFORE UPDATE ON public.ss_contracts
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE INDEX ss_contracts_customer_idx ON public.ss_contracts(customer_id);

CREATE TABLE public.ss_contract_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES public.ss_contracts(id) ON DELETE CASCADE,
  event text NOT NULL,
  detail text,
  ip text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.ss_contract_events TO authenticated;
GRANT ALL ON public.ss_contract_events TO service_role;
ALTER TABLE public.ss_contract_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "office reads contract events" ON public.ss_contract_events FOR SELECT TO authenticated USING (public.ss_is_office());
CREATE POLICY "office writes contract events" ON public.ss_contract_events FOR INSERT TO authenticated WITH CHECK (public.ss_is_office());
CREATE INDEX ss_contract_events_contract_idx ON public.ss_contract_events(contract_id);

-- ============ SEED DATA ============
INSERT INTO public.ss_city_rates (city, low, high, sort_order) VALUES
  ('Highland Park', 250, 320, 1),
  ('University Park', 240, 300, 2),
  ('Dallas', 220, 280, 3),
  ('Prosper', 200, 250, 4),
  ('Frisco', 190, 240, 5),
  ('Plano', 190, 240, 6),
  ('Celina', 190, 240, 7),
  ('McKinney', 180, 230, 8),
  ('Allen', 180, 220, 9),
  ('Rockwall', 180, 220, 10),
  ('Rowlett', 165, 200, 11),
  ('Sachse', 165, 195, 12),
  ('Garland', 160, 190, 13),
  ('Forney', 160, 190, 14),
  ('Mesquite', 150, 180, 15)
ON CONFLICT (city) DO NOTHING;

INSERT INTO public.ss_addons (key, label, kind, amount, description, sort_order) VALUES
  ('spa_medium', 'Medium spa', 'flat', 25, 'Attached spa up to 500 gallons', 1),
  ('spa_large', 'Large spa', 'flat', 40, 'Attached spa over 500 gallons', 2),
  ('chem_included', 'Chemicals included', 'flat', 35, 'All chemicals bundled into the monthly rate', 3),
  ('salt_cell', 'Saltwater system', 'flat', 20, 'Salt cell inspection, cleaning and calibration', 4),
  ('chem_only_factor', 'Chem-only service factor', 'percent', 62, 'Percent of full-service rate for chem-only visits', 5)
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.ss_promo_codes (code, description, discount_type, value, applies_to, min_commitment_months)
VALUES ('LOYAL12', '12-month commitment — 10% off monthly service', 'percent', 10, 'recurring', 12)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.ss_settings (key, value) VALUES
  ('pricing_margins', '{"chem_cost_basis": 38, "margin_multiplier": 3, "wizard_done": false}'::jsonb)
ON CONFLICT (key) DO NOTHING;