DROP POLICY "Active products are public" ON public.products;
CREATE POLICY "Active products are public" ON public.products FOR SELECT USING (is_active = true);
CREATE POLICY "Admins view all products" ON public.products FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'));