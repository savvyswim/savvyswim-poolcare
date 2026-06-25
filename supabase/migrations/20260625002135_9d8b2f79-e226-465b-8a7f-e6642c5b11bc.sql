
-- Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role=_role) $$;

CREATE POLICY "Users can read their own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can read all roles" ON public.user_roles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Bootstrap: first signed-in user can claim admin if none exists yet
CREATE OR REPLACE FUNCTION public.claim_admin_if_unowned()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE has_any boolean;
BEGIN
  IF auth.uid() IS NULL THEN RETURN false; END IF;
  SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE role='admin') INTO has_any;
  IF has_any THEN RETURN false; END IF;
  INSERT INTO public.user_roles(user_id, role) VALUES (auth.uid(), 'admin')
    ON CONFLICT DO NOTHING;
  RETURN true;
END $$;
GRANT EXECUTE ON FUNCTION public.claim_admin_if_unowned() TO authenticated;

-- Pool designs
CREATE TABLE public.pool_designs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  style text NOT NULL,
  features text[] NOT NULL DEFAULT '{}',
  est_price_low int,
  est_price_high int,
  image_path text NOT NULL,
  display_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pool_designs TO authenticated;
GRANT ALL ON public.pool_designs TO service_role;
ALTER TABLE public.pool_designs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage pool designs" ON public.pool_designs
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
CREATE TRIGGER pool_designs_updated_at BEFORE UPDATE ON public.pool_designs
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
