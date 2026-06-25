
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM public, anon, authenticated;
GRANT USAGE ON SCHEMA private TO postgres, service_role;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role=_role) $$;

REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM public, anon, authenticated;

-- public.pool_designs
DROP POLICY IF EXISTS "Admins manage pool designs" ON public.pool_designs;
CREATE POLICY "Admins manage pool designs" ON public.pool_designs
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

-- public.user_roles
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can read all roles" ON public.user_roles;
CREATE POLICY "Admins can read all roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role));

-- storage.objects policies for pool-designs bucket
DROP POLICY IF EXISTS "Admins read pool design files" ON storage.objects;
DROP POLICY IF EXISTS "Admins write pool design files" ON storage.objects;
DROP POLICY IF EXISTS "Admins update pool design files" ON storage.objects;
DROP POLICY IF EXISTS "Admins delete pool design files" ON storage.objects;

CREATE POLICY "Admins read pool design files" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'pool-designs' AND private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins write pool design files" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'pool-designs' AND private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins update pool design files" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'pool-designs' AND private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins delete pool design files" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'pool-designs' AND private.has_role(auth.uid(), 'admin'::public.app_role));

-- Drop old public SECURITY DEFINER functions exposed to authenticated
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);
DROP FUNCTION IF EXISTS public.claim_admin_if_unowned();

-- Replace claim_admin_if_unowned RPC with an auth.users trigger bootstrap
CREATE OR REPLACE FUNCTION private.bootstrap_first_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END $$;

REVOKE ALL ON FUNCTION private.bootstrap_first_admin() FROM public, anon, authenticated;

DROP TRIGGER IF EXISTS on_auth_user_created_bootstrap_admin ON auth.users;
CREATE TRIGGER on_auth_user_created_bootstrap_admin
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION private.bootstrap_first_admin();
