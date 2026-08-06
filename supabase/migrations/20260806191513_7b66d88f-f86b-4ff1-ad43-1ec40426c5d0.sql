ALTER TABLE public.ss_customers
  ADD COLUMN IF NOT EXISTS last_filter_clean_at date,
  ADD COLUMN IF NOT EXISTS filter_interval_days integer NOT NULL DEFAULT 90;

-- Extend the customer-portal pool view with filter status
DROP FUNCTION IF EXISTS public.ss_my_pool();
CREATE OR REPLACE FUNCTION public.ss_my_pool()
 RETURNS TABLE(id uuid, full_name text, address text, city text, service_level text, pool_type text, gallons integer, route_day text, monthly_price numeric, referral_code text, status ss_cust_status, last_filter_clean_at date, filter_interval_days integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT c.id, c.full_name, c.address, c.city, c.service_level, c.pool_type,
         c.gallons, c.route_day, c.monthly_price, c.referral_code, c.status,
         c.last_filter_clean_at, c.filter_interval_days
  FROM public.ss_customers c WHERE c.user_id = auth.uid()
$$;