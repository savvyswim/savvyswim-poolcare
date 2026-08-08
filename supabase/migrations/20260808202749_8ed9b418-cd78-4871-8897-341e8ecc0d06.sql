CREATE TABLE IF NOT EXISTS public.ss_contact_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.ss_customers(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  channel text NOT NULL CHECK (channel IN ('email','sms')),
  new_value text NOT NULL,
  code_hash text NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ss_contact_verifications_cust_idx
  ON public.ss_contact_verifications (customer_id, channel, created_at DESC);

GRANT ALL ON public.ss_contact_verifications TO service_role;

ALTER TABLE public.ss_contact_verifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Office can review contact verifications" ON public.ss_contact_verifications;
CREATE POLICY "Office can review contact verifications"
  ON public.ss_contact_verifications FOR SELECT TO authenticated
  USING (public.ss_is_office());

GRANT SELECT ON public.ss_contact_verifications TO authenticated;

CREATE OR REPLACE FUNCTION public.ss_portal_update_profile(p_patch jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_id uuid := public.ss_my_customer_id();
BEGIN
  IF v_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'No customer account');
  END IF;

  -- phone + email are intentionally NOT updatable here: they require a
  -- verification code sent to the new address/number.
  UPDATE public.ss_customers SET
    address           = COALESCE(NULLIF(TRIM(p_patch->>'address'), ''), address),
    city              = COALESCE(NULLIF(TRIM(p_patch->>'city'), ''), city),
    state             = COALESCE(NULLIF(TRIM(p_patch->>'state'), ''), state),
    postal_code       = COALESCE(NULLIF(TRIM(p_patch->>'postal_code'), ''), postal_code),
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
$function$;

REVOKE ALL ON FUNCTION public.ss_portal_update_profile(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ss_portal_update_profile(jsonb) TO authenticated, service_role;