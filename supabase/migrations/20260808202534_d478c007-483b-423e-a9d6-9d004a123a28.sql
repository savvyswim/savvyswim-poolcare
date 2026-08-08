REVOKE EXECUTE ON FUNCTION public.ss_my_profile() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.ss_my_profile() TO authenticated;