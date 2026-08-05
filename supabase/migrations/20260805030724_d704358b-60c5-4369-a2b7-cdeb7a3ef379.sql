-- storage policies
CREATE POLICY "staff manage service photos" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'service-photos' AND public.ss_is_staff())
  WITH CHECK (bucket_id = 'service-photos' AND public.ss_is_staff());

CREATE POLICY "customer reads own service photos" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'service-photos' AND (storage.foldername(name))[1] = public.ss_my_customer_id()::text);

-- default custom property fields
INSERT INTO public.ss_custom_fields (label, field_type, is_warning, sort_order) VALUES
  ('Locked Gate','boolean',true,1),
  ('Dogs on property','boolean',true,2);

-- price book
INSERT INTO public.ss_price_book (name, description, price, category, recurs_days) VALUES
  ('Filter Clean','Full cartridge/DE filter teardown and clean',125,'maintenance',90),
  ('Green-to-Clean','Multi-visit algae recovery',550,'recovery',NULL),
  ('Cleanup Visit','Neglected pool catch-up service',195,'recovery',NULL),
  ('Salt Cell Clean','Acid wash salt cell',95,'maintenance',180),
  ('Pump Replacement','Variable speed pump swap (labor)',280,'repair',NULL),
  ('Heater Diagnostic','Full heater inspection + report',150,'repair',NULL),
  ('Drain & Refill','Partial drain and refill service',450,'maintenance',NULL);

INSERT INTO public.ss_bundles (name, description, price, items) VALUES
  ('New Pool Owner','Orientation, full chem balance, filter clean, equipment walkthrough',290,'["Filter Clean","Chem Balance","Equipment Walkthrough"]'::jsonb),
  ('Season Opener','Cover removal, deep clean, filter clean, full startup chemistry',640,'["Deep Clean","Filter Clean","Startup Chemistry","Cover Removal"]'::jsonb);

INSERT INTO public.ss_inventory (name, unit, quantity, low_threshold) VALUES
  ('Liquid Chlorine 12.5%','gal',24,8),
  ('Muriatic Acid','gal',12,4),
  ('Cal-Hypo Shock','lb',40,10),
  ('Sodium Bicarbonate','lb',50,15),
  ('Pool Salt','bag',18,6),
  ('DE Powder','lb',25,8),
  ('Chlorine Tabs 3"','bucket',6,2);

INSERT INTO public.ss_trucks (name) VALUES ('Truck 1 — Burgundy'), ('Truck 2 — Cream');

INSERT INTO public.ss_truck_items (truck_id, label, is_stocked, sort_order)
SELECT t.id, i.label, i.stocked, i.ord
FROM public.ss_trucks t
CROSS JOIN (VALUES
  ('Telescoping pole', true, 1),
  ('Leaf rake', true, 2),
  ('Wall brush', true, 3),
  ('Vacuum head + hose', true, 4),
  ('Test kit (Taylor K-2006)', true, 5),
  ('Liquid chlorine (4 gal)', false, 6),
  ('Muriatic acid (2 gal)', true, 7),
  ('Filter o-ring kit', false, 8),
  ('Safety goggles + gloves', true, 9)
) AS i(label, stocked, ord);

INSERT INTO public.ss_settings (key, value) VALUES
  ('company','{"name":"Savvy Swim","tagline":"On duty, so you don''t have to be.","phone":"","email":"hello@savvyswim.com","city":"Dallas–Fort Worth, TX"}'::jsonb),
  ('google_review_url','{"url":"https://g.page/r/savvyswim/review"}'::jsonb),
  ('lead_intake_key','{"key":"ss_live_lead_intake_key_change_me"}'::jsonb),
  ('route_automations','{"auto_on_my_way":true,"auto_start_minutes":5,"geofence_feet":600}'::jsonb),
  ('chem_costs','{"chlorine_per_oz":0.05,"acid_per_oz":0.045}'::jsonb),
  ('quickbooks','{"last_synced":null}'::jsonb);