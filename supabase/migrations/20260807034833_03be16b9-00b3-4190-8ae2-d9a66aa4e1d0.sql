CREATE POLICY "Customers view own subscription" ON public.subscriptions
FOR SELECT TO authenticated
USING (lower(email) = lower(coalesce((auth.jwt() ->> 'email'), '')));