CREATE TABLE public.ss_equipment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.ss_customers(id) ON DELETE CASCADE,
  water_body_id uuid REFERENCES public.ss_water_bodies(id) ON DELETE SET NULL,
  kind text NOT NULL DEFAULT 'other',
  name text NOT NULL DEFAULT 'Equipment',
  brand text,
  model text,
  serial_number text,
  spec jsonb NOT NULL DEFAULT '{}'::jsonb,
  condition text NOT NULL DEFAULT 'good',
  installed_on date,
  warranty_expires_on date,
  last_serviced_on date,
  notes text,
  photos jsonb NOT NULL DEFAULT '[]'::jsonb,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ss_equipment_customer_idx ON public.ss_equipment(customer_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ss_equipment TO authenticated;
GRANT ALL ON public.ss_equipment TO service_role;

ALTER TABLE public.ss_equipment ENABLE ROW LEVEL SECURITY;

CREATE POLICY "office manage equipment" ON public.ss_equipment FOR ALL TO authenticated
  USING (ss_is_office()) WITH CHECK (ss_is_office());
CREATE POLICY "staff read equipment" ON public.ss_equipment FOR SELECT TO authenticated
  USING (ss_is_staff());
CREATE POLICY "customer reads own equipment" ON public.ss_equipment FOR SELECT TO authenticated
  USING (customer_id = ss_my_customer_id());

CREATE TRIGGER ss_equipment_updated_at BEFORE UPDATE ON public.ss_equipment
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE POLICY "staff read equipment photos" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'equipment-photos' AND ss_is_staff());
CREATE POLICY "office write equipment photos" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'equipment-photos' AND ss_is_staff());
CREATE POLICY "office delete equipment photos" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'equipment-photos' AND ss_is_office());