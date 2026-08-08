CREATE OR REPLACE FUNCTION public.ss_my_customer_ids()
RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT id FROM public.ss_customers WHERE user_id = auth.uid() $$;

REVOKE EXECUTE ON FUNCTION public.ss_my_customer_ids() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ss_my_customer_ids() TO authenticated, service_role;

CREATE TABLE public.ss_service_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.ss_customers(id) ON DELETE CASCADE,
  label text NOT NULL DEFAULT 'Service address',
  address text NOT NULL,
  city text,
  state text,
  postal_code text,
  notes text,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ss_service_addresses_customer_idx ON public.ss_service_addresses(customer_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ss_service_addresses TO authenticated;
GRANT ALL ON public.ss_service_addresses TO service_role;

ALTER TABLE public.ss_service_addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers manage their own service addresses"
ON public.ss_service_addresses FOR ALL TO authenticated
USING (customer_id IN (SELECT public.ss_my_customer_ids()))
WITH CHECK (customer_id IN (SELECT public.ss_my_customer_ids()));

CREATE POLICY "Staff manage all service addresses"
ON public.ss_service_addresses FOR ALL TO authenticated
USING (public.ss_is_staff())
WITH CHECK (public.ss_is_staff());

CREATE TRIGGER ss_service_addresses_updated_at
BEFORE UPDATE ON public.ss_service_addresses
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();