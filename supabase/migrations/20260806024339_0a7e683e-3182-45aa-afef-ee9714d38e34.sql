DROP POLICY IF EXISTS "public submits quote" ON public.ss_leads;

CREATE POLICY "public submits quote"
ON public.ss_leads
FOR INSERT
TO anon, authenticated
WITH CHECK (
  length(btrim(full_name)) BETWEEN 2 AND 80
  AND (email IS NULL OR (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' AND length(email) <= 200))
  AND (phone IS NULL OR length(btrim(phone)) BETWEEN 7 AND 30)
  AND coalesce(length(address), 0) <= 200
  AND coalesce(length(city), 0) <= 80
  AND coalesce(length(message), 0) <= 1000
  AND coalesce(length(pool_size), 0) <= 40
  AND coalesce(length(service_type), 0) <= 60
  AND coalesce(length(condition), 0) <= 60
  AND coalesce(length(spa_option), 0) <= 60
  AND coalesce(length(promo_code), 0) <= 40
  AND coalesce(length(source), 0) <= 60
  AND coalesce(length(photo_url), 0) <= 500
  AND stage = 'new_lead'::ss_stage
  AND coalesce(monthly_value, 0) = 0
  AND coalesce(spa_addon, 0) = 0
  AND cleanup_price IS NULL
  AND converted_customer_id IS NULL
  AND (commitment_months IS NULL OR commitment_months BETWEEN 1 AND 36)
);

CREATE POLICY "office creates leads"
ON public.ss_leads
FOR INSERT
TO authenticated
WITH CHECK (public.ss_is_office());