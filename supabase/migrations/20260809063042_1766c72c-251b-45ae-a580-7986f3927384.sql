ALTER TABLE public.inspection_requests
  ADD COLUMN IF NOT EXISTS preferred_slot text,
  ADD COLUMN IF NOT EXISTS converted_customer_id uuid REFERENCES public.ss_customers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS converted_at timestamptz;

CREATE INDEX IF NOT EXISTS inspection_requests_converted_idx
  ON public.inspection_requests (converted_customer_id);