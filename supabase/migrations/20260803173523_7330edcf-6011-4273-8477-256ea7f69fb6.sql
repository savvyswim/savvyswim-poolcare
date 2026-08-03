ALTER TABLE public.cleaning_plans
  ADD COLUMN IF NOT EXISTS price_small numeric(10,2),
  ADD COLUMN IF NOT EXISTS price_medium numeric(10,2),
  ADD COLUMN IF NOT EXISTS price_large numeric(10,2),
  ADD COLUMN IF NOT EXISTS price_key_small text,
  ADD COLUMN IF NOT EXISTS price_key_medium text,
  ADD COLUMN IF NOT EXISTS price_key_large text;

UPDATE public.cleaning_plans SET
  name = 'Savvy Essential (Chemicals Only)',
  blurb = 'Chemical-only service: balanced water, delivered and dosed for you.',
  price_small = 119, price_medium = 149, price_large = 199,
  price_key_small = 'savvy_essential_small_monthly',
  price_key_medium = 'savvy_essential_medium_monthly',
  price_key_large = 'savvy_essential_large_monthly'
WHERE display_order = 1;

UPDATE public.cleaning_plans SET
  price_small = 179, price_medium = 219, price_large = 279,
  price_key_small = 'weekly_crystal_small_monthly',
  price_key_medium = 'weekly_crystal_medium_monthly',
  price_key_large = 'weekly_crystal_large_monthly'
WHERE display_order = 2;

UPDATE public.cleaning_plans SET
  price_small = 299, price_medium = 349, price_large = 429,
  price_key_small = 'total_care_small_monthly',
  price_key_medium = 'total_care_medium_monthly',
  price_key_large = 'total_care_large_monthly'
WHERE display_order = 3;

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_subscription_id text UNIQUE,
  stripe_customer_id text,
  environment text NOT NULL DEFAULT 'sandbox',
  customer_name text,
  email text,
  phone text,
  address text,
  plan_id uuid REFERENCES public.cleaning_plans(id) ON DELETE SET NULL,
  plan_name text,
  pool_size text,
  price_key text,
  amount numeric(10,2),
  status text NOT NULL DEFAULT 'incomplete',
  current_period_end timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  canceled_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage subscriptions"
ON public.subscriptions FOR ALL
TO authenticated
USING (private.has_role(auth.uid(), 'admin'))
WITH CHECK (private.has_role(auth.uid(), 'admin'));

CREATE TRIGGER subscriptions_updated_at
BEFORE UPDATE ON public.subscriptions
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE INDEX IF NOT EXISTS subscriptions_email_idx ON public.subscriptions (email);
CREATE INDEX IF NOT EXISTS subscriptions_status_idx ON public.subscriptions (status);