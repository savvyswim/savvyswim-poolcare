ALTER TABLE public.inspection_requests
  ADD COLUMN IF NOT EXISTS promo_code text,
  ADD COLUMN IF NOT EXISTS promo_status text,
  ADD COLUMN IF NOT EXISTS promo_detail text;

CREATE INDEX IF NOT EXISTS inspection_requests_promo_code_idx
  ON public.inspection_requests (promo_code) WHERE promo_code IS NOT NULL;

CREATE OR REPLACE FUNCTION public.ss_validate_lead_code(_code text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c text := upper(btrim(coalesce(_code, '')));
  p public.ss_promo_codes%ROWTYPE;
  s public.promo_codes%ROWTYPE;
  ref record;
BEGIN
  IF c = '' THEN
    RETURN jsonb_build_object('status', 'empty', 'code', null, 'kind', null, 'message', null);
  END IF;

  SELECT * INTO p FROM public.ss_promo_codes WHERE upper(code) = c;
  IF p.id IS NOT NULL THEN
    IF p.is_active IS NOT TRUE THEN
      RETURN jsonb_build_object('status','inactive','code',c,'kind','promo','message','That code is no longer active');
    END IF;
    IF p.expires_at IS NOT NULL AND now() > p.expires_at THEN
      RETURN jsonb_build_object('status','expired','code',c,'kind','promo','message','That code has expired');
    END IF;
    IF p.max_redemptions IS NOT NULL AND coalesce(p.times_used,0) >= p.max_redemptions THEN
      RETURN jsonb_build_object('status','used_up','code',c,'kind','promo','message','That code has been fully redeemed');
    END IF;
    RETURN jsonb_build_object(
      'status','valid','code',c,'kind','promo',
      'detail', coalesce(p.description,
        CASE WHEN p.discount_type = 'percent'
          THEN to_char(p.value, 'FM999990.##') || '% off'
          ELSE '$' || to_char(p.value, 'FM999990.00') || ' off' END),
      'message','Code applied');
  END IF;

  SELECT * INTO s FROM public.promo_codes WHERE upper(code) = c;
  IF s.id IS NOT NULL THEN
    IF s.is_active IS NOT TRUE
       OR (s.starts_at IS NOT NULL AND now() < s.starts_at)
       OR (s.expires_at IS NOT NULL AND now() > s.expires_at) THEN
      RETURN jsonb_build_object('status','expired','code',c,'kind','promo','message','That code is not active');
    END IF;
    RETURN jsonb_build_object(
      'status','valid','code',c,'kind','promo',
      'detail', coalesce(s.description,
        CASE WHEN s.discount_type = 'percent'
          THEN to_char(s.discount_value, 'FM999990.##') || '% off'
          ELSE '$' || to_char(s.discount_value, 'FM999990.00') || ' off' END),
      'message','Code applied');
  END IF;

  SELECT id, full_name INTO ref FROM public.ss_customers
    WHERE referral_code IS NOT NULL AND upper(referral_code) = c LIMIT 1;
  IF ref.id IS NOT NULL THEN
    RETURN jsonb_build_object('status','valid','code',c,'kind','referral',
      'detail','Referral credit','message','Referral code applied');
  END IF;

  RETURN jsonb_build_object('status','unknown','code',c,'kind',null,'message','We do not recognise that code — send it anyway and the office will check');
END;
$$;

REVOKE ALL ON FUNCTION public.ss_validate_lead_code(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ss_validate_lead_code(text) TO service_role;