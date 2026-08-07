REVOKE ALL ON FUNCTION public.ss_my_pool() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ss_my_pool() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.ss_my_invoice_lines(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ss_my_invoice_lines(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.ss_tg_invoice_item_upsell() FROM PUBLIC, anon, authenticated;
