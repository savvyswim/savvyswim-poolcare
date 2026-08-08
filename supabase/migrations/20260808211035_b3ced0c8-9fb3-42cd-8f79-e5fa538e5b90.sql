CREATE OR REPLACE FUNCTION public.ss_my_level(_uid uuid)
RETURNS ss_level
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT level FROM public.ss_staff WHERE user_id = _uid AND is_active LIMIT 1),
    (SELECT 'owner'::ss_level FROM public.user_roles WHERE user_id = _uid AND role = 'admin' LIMIT 1)
  )
$$;