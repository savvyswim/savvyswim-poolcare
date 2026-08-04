ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'crm_manager';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'store_manager';

CREATE TABLE IF NOT EXISTS public.admin_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  roles public.app_role[] NOT NULL DEFAULT '{}',
  note text,
  status text NOT NULL DEFAULT 'pending',
  invited_by uuid,
  accepted_by uuid,
  accepted_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT admin_invitations_status_check CHECK (status IN ('pending','accepted','revoked'))
);

CREATE UNIQUE INDEX IF NOT EXISTS admin_invitations_pending_email_idx
  ON public.admin_invitations (lower(email))
  WHERE status = 'pending';

GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_invitations TO authenticated;
GRANT ALL ON public.admin_invitations TO service_role;

ALTER TABLE public.admin_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view invitations"
  ON public.admin_invitations FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can create invitations"
  ON public.admin_invitations FOR INSERT TO authenticated
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role) AND invited_by = auth.uid());

CREATE POLICY "Admins can update invitations"
  ON public.admin_invitations FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can delete invitations"
  ON public.admin_invitations FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE OR REPLACE FUNCTION public.set_admin_invitations_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $fn$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$fn$;

REVOKE EXECUTE ON FUNCTION public.set_admin_invitations_updated_at() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER update_admin_invitations_updated_at
  BEFORE UPDATE ON public.admin_invitations
  FOR EACH ROW EXECUTE FUNCTION public.set_admin_invitations_updated_at();

CREATE OR REPLACE FUNCTION public.apply_admin_invitation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inv public.admin_invitations%ROWTYPE;
  r public.app_role;
BEGIN
  IF NEW.email IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT * INTO inv
  FROM public.admin_invitations
  WHERE lower(email) = lower(NEW.email)
    AND status = 'pending'
    AND expires_at > now()
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  FOREACH r IN ARRAY inv.roles LOOP
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, r)
    ON CONFLICT (user_id, role) DO NOTHING;
  END LOOP;

  UPDATE public.admin_invitations
  SET status = 'accepted', accepted_by = NEW.id, accepted_at = now()
  WHERE id = inv.id;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.apply_admin_invitation() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS on_auth_user_created_apply_invitation ON auth.users;
CREATE TRIGGER on_auth_user_created_apply_invitation
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.apply_admin_invitation();