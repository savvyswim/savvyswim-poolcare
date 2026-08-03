DROP POLICY "Anyone can submit an order request" ON public.shop_orders;

CREATE POLICY "Anyone can submit a valid order request"
  ON public.shop_orders FOR INSERT TO anon, authenticated
  WITH CHECK (
    length(trim(customer_name)) BETWEEN 2 AND 120
    AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    AND length(email) <= 200
    AND length(trim(item_name)) BETWEEN 2 AND 200
    AND quantity BETWEEN 1 AND 100
    AND order_type IN ('product', 'cleaning_plan')
    AND status = 'new'
    AND coalesce(length(notes), 0) <= 2000
  );