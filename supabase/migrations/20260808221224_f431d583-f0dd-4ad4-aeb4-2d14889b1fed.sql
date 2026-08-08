ALTER TABLE public.ss_service_addresses
  ADD COLUMN IF NOT EXISTS is_billing boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS ss_service_addresses_unique_norm
  ON public.ss_service_addresses (
    customer_id,
    lower(regexp_replace(address, '\s+', ' ', 'g')),
    lower(coalesce(city, '')),
    coalesce(postal_code, ''),
    is_billing
  );