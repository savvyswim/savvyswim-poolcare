REVOKE ALL ON FUNCTION public.check_promo_code(text, numeric) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.place_store_order(text, text, text, text, text, text, text, text, jsonb, text) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.check_promo_code(text, numeric) TO service_role;
GRANT EXECUTE ON FUNCTION public.place_store_order(text, text, text, text, text, text, text, text, jsonb, text) TO service_role;