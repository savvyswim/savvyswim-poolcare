DROP FUNCTION IF EXISTS public.ss_my_profile();
CREATE FUNCTION public.ss_my_profile()
RETURNS TABLE(id uuid, full_name text, address text, city text, state text, postal_code text, phone text, email text, gate_code text, dog_name text, location_notes text, preferred_contact text, notify_visits boolean, notify_invoices boolean, notify_reports boolean, notify_marketing boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id, c.full_name, c.address, c.city, c.state, c.postal_code, c.phone, c.email,
         c.gate_code, c.dog_name, c.location_notes,
         COALESCE(c.preferred_contact, 'email'),
         COALESCE(c.notify_visits, true), COALESCE(c.notify_invoices, true),
         COALESCE(c.notify_reports, true), COALESCE(c.notify_marketing, false)
  FROM public.ss_customers c
  WHERE c.id = public.ss_my_customer_id()
$$;

CREATE OR REPLACE FUNCTION public.ss_portal_update_profile(p_patch jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid := public.ss_my_customer_id();
BEGIN
  IF v_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'No customer account');
  END IF;

  UPDATE public.ss_customers SET
    address           = COALESCE(NULLIF(TRIM(p_patch->>'address'), ''), address),
    city              = COALESCE(NULLIF(TRIM(p_patch->>'city'), ''), city),
    state             = COALESCE(NULLIF(TRIM(p_patch->>'state'), ''), state),
    postal_code       = COALESCE(NULLIF(TRIM(p_patch->>'postal_code'), ''), postal_code),
    phone             = COALESCE(NULLIF(TRIM(p_patch->>'phone'), ''), phone),
    email             = COALESCE(NULLIF(TRIM(p_patch->>'email'), ''), email),
    gate_code         = COALESCE(LEFT(TRIM(p_patch->>'gate_code'), 40), gate_code),
    dog_name          = COALESCE(LEFT(TRIM(p_patch->>'dog_name'), 80), dog_name),
    location_notes    = COALESCE(LEFT(TRIM(p_patch->>'location_notes'), 1000), location_notes),
    preferred_contact = COALESCE(NULLIF(p_patch->>'preferred_contact', ''), preferred_contact),
    notify_visits     = COALESCE((p_patch->>'notify_visits')::boolean, notify_visits),
    notify_invoices   = COALESCE((p_patch->>'notify_invoices')::boolean, notify_invoices),
    notify_reports    = COALESCE((p_patch->>'notify_reports')::boolean, notify_reports),
    notify_marketing  = COALESCE((p_patch->>'notify_marketing')::boolean, notify_marketing)
  WHERE id = v_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;

ALTER TABLE public.ss_customers
  DROP COLUMN IF EXISTS pool_detail_make,
  DROP COLUMN IF EXISTS pool_detail_model,
  DROP COLUMN IF EXISTS pool_detail_year,
  DROP COLUMN IF EXISTS pool_detail_code;