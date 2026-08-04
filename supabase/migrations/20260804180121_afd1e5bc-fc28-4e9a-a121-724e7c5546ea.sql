-- 1) Fix mutable search_path on pgmq helper functions
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = pgmq, public;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = pgmq, public;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = pgmq, public;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = pgmq, public;

-- 2) Revoke public/anon/authenticated EXECUTE on internal SECURITY DEFINER functions
REVOKE ALL ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.email_queue_dispatch() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.email_queue_wake() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.apply_admin_invitation() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.tg_booking_to_crm() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.tg_set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_admin_invitations_updated_at() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.delete_email(text, bigint) TO service_role;
GRANT EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.email_queue_dispatch() TO service_role;

-- 3) Keep storefront functions callable (they validate their own inputs)
GRANT EXECUTE ON FUNCTION public.check_promo_code(text, numeric) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.place_store_order(text, text, text, text, text, text, text, text, jsonb, text) TO anon, authenticated, service_role;