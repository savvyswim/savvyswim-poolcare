ALTER TABLE public.ss_customers
  ADD COLUMN IF NOT EXISTS vehicle_make text,
  ADD COLUMN IF NOT EXISTS vehicle_model text,
  ADD COLUMN IF NOT EXISTS vehicle_year integer,
  ADD COLUMN IF NOT EXISTS vehicle_vin text;

DROP FUNCTION IF EXISTS public.ss_my_profile();

CREATE FUNCTION public.ss_my_profile()
 RETURNS TABLE(id uuid, full_name text, address text, city text, state text, postal_code text, phone text, email text, gate_code text, dog_name text, location_notes text, preferred_contact text, notify_visits boolean, notify_invoices boolean, notify_reports boolean, notify_marketing boolean, vehicle_make text, vehicle_model text, vehicle_year integer, vehicle_vin text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT c.id, c.full_name, c.address, c.city, c.state, c.postal_code,
         c.phone, c.email, c.gate_code, c.dog_name, c.location_notes,
         c.preferred_contact, c.notify_visits, c.notify_invoices,
         c.notify_reports, c.notify_marketing,
         c.vehicle_make, c.vehicle_model, c.vehicle_year, c.vehicle_vin
  FROM public.ss_customers c WHERE c.user_id = auth.uid()
$function$;

REVOKE EXECUTE ON FUNCTION public.ss_my_profile() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ss_my_profile() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.ss_portal_update_profile(p_patch jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  c public.ss_customers%ROWTYPE;
  v_contact text;
  v_vin text;
  v_year int;
BEGIN
  SELECT * INTO c FROM public.ss_customers WHERE user_id = auth.uid() LIMIT 1;
  IF c.id IS NULL THEN
    RAISE EXCEPTION 'No property is linked to this account';
  END IF;

  v_contact := lower(btrim(coalesce(p_patch->>'preferred_contact', c.preferred_contact)));
  IF v_contact NOT IN ('email','sms','phone') THEN
    RAISE EXCEPTION 'Choose email, text, or phone as your preferred contact';
  END IF;

  IF p_patch ? 'email' AND coalesce(btrim(p_patch->>'email'),'') !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'Enter a valid email address';
  END IF;
  IF p_patch ? 'address' AND char_length(btrim(coalesce(p_patch->>'address',''))) < 4 THEN
    RAISE EXCEPTION 'Enter the full service address';
  END IF;

  v_vin := nullif(upper(btrim(coalesce(p_patch->>'vehicle_vin',''))), '');
  IF v_vin IS NOT NULL AND v_vin !~ '^[A-HJ-NPR-Z0-9]{11,17}$' THEN
    RAISE EXCEPTION 'Enter a valid identifier';
  END IF;

  v_year := nullif(btrim(coalesce(p_patch->>'vehicle_year','')), '')::int;
  IF v_year IS NOT NULL AND (v_year < 1900 OR v_year > extract(year from now())::int + 2) THEN
    RAISE EXCEPTION 'Enter a valid vehicle year';
  END IF;

  UPDATE public.ss_customers SET
    address = coalesce(nullif(btrim(left(p_patch->>'address', 300)), ''), address),
    city = coalesce(nullif(btrim(left(p_patch->>'city', 120)), ''), city),
    state = coalesce(nullif(btrim(left(p_patch->>'state', 60)), ''), state),
    postal_code = coalesce(nullif(btrim(left(p_patch->>'postal_code', 20)), ''), postal_code),
    phone = coalesce(nullif(btrim(left(p_patch->>'phone', 40)), ''), phone),
    email = coalesce(nullif(btrim(left(p_patch->>'email', 200)), ''), email),
    gate_code = CASE WHEN p_patch ? 'gate_code' THEN nullif(btrim(left(p_patch->>'gate_code', 60)), '') ELSE gate_code END,
    dog_name = CASE WHEN p_patch ? 'dog_name' THEN nullif(btrim(left(p_patch->>'dog_name', 80)), '') ELSE dog_name END,
    location_notes = CASE WHEN p_patch ? 'location_notes' THEN nullif(btrim(left(p_patch->>'location_notes', 1000)), '') ELSE location_notes END,
    vehicle_make = CASE WHEN p_patch ? 'vehicle_make' THEN nullif(btrim(left(p_patch->>'vehicle_make', 60)), '') ELSE vehicle_make END,
    vehicle_model = CASE WHEN p_patch ? 'vehicle_model' THEN nullif(btrim(left(p_patch->>'vehicle_model', 60)), '') ELSE vehicle_model END,
    vehicle_year = CASE WHEN p_patch ? 'vehicle_year' THEN v_year ELSE vehicle_year END,
    vehicle_vin = CASE WHEN p_patch ? 'vehicle_vin' THEN v_vin ELSE vehicle_vin END,
    preferred_contact = v_contact,
    notify_visits = coalesce((p_patch->>'notify_visits')::boolean, notify_visits),
    notify_invoices = coalesce((p_patch->>'notify_invoices')::boolean, notify_invoices),
    notify_reports = coalesce((p_patch->>'notify_reports')::boolean, notify_reports),
    notify_marketing = coalesce((p_patch->>'notify_marketing')::boolean, notify_marketing)
  WHERE id = c.id
  RETURNING * INTO c;

  INSERT INTO public.ss_feed (customer_id, kind, title, body)
  VALUES (c.id, 'profile', 'Property profile updated',
    'Updated from the customer portal · preferred contact: ' || c.preferred_contact);

  INSERT INTO public.ss_alerts (customer_id, tech_id, priority, title, body)
  VALUES (c.id, c.assigned_tech_id, 'normal',
    'Profile updated — ' || c.full_name,
    coalesce(c.address, '') || ' · ' || coalesce(c.city, '') || ' · contact via ' || c.preferred_contact);

  RETURN jsonb_build_object('ok', true, 'preferred_contact', c.preferred_contact);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.ss_portal_update_profile(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ss_portal_update_profile(jsonb) TO authenticated, service_role;