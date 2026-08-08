CREATE TABLE IF NOT EXISTS public.ss_test_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'customer',
  environment text NOT NULL DEFAULT 'preview',
  notes text,
  last_rotated_at timestamptz,
  last_rotated_by uuid,
  rotation_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (email, environment)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ss_test_accounts TO authenticated;
GRANT ALL ON public.ss_test_accounts TO service_role;

ALTER TABLE public.ss_test_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners manage test accounts" ON public.ss_test_accounts;
CREATE POLICY "Owners manage test accounts"
ON public.ss_test_accounts FOR ALL TO authenticated
USING (public.ss_is_owner())
WITH CHECK (public.ss_is_owner());

DROP TRIGGER IF EXISTS ss_test_accounts_updated_at ON public.ss_test_accounts;
CREATE TRIGGER ss_test_accounts_updated_at
BEFORE UPDATE ON public.ss_test_accounts
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

INSERT INTO public.ss_test_accounts (label, email, role, environment, notes)
VALUES
  ('Test technician', 'testtech@savvyswim.com', 'tech', 'preview', 'Route/jobs QA login'),
  ('Test customer', 'testcustomer@savvyswim.com', 'customer', 'preview', 'Portal QA login')
ON CONFLICT (email, environment) DO NOTHING;