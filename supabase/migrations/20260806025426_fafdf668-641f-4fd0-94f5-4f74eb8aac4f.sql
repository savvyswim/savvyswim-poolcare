DROP POLICY IF EXISTS "promo codes readable" ON public.ss_promo_codes;
CREATE POLICY "staff read promo codes" ON public.ss_promo_codes
  FOR SELECT TO authenticated
  USING (public.ss_is_staff());
REVOKE SELECT ON public.ss_promo_codes FROM anon;

REVOKE EXECUTE ON FUNCTION public.ss_my_level(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ss_my_level(uuid) TO service_role;

REVOKE EXECUTE ON FUNCTION public.ss_is_owner() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.ss_is_office() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.ss_is_staff() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.ss_my_customer_id() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.ss_my_staff_id() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.ss_my_pool() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.ss_request_visit_reschedule(uuid, date, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.ss_set_visit_flag(uuid, text, boolean) FROM PUBLIC, anon;