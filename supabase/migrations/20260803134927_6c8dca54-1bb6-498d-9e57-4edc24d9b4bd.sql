DROP POLICY "Anyone can place an order" ON public.store_orders;
CREATE POLICY "Guests can place a valid order" ON public.store_orders FOR INSERT
  WITH CHECK (
    char_length(customer_name) BETWEEN 2 AND 120
    AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    AND (phone IS NULL OR char_length(phone) <= 40)
    AND (address IS NULL OR char_length(address) <= 300)
    AND (notes IS NULL OR char_length(notes) <= 2000)
    AND subtotal >= 0 AND subtotal <= 500000
    AND total >= 0 AND total <= 500000
    AND status = 'new'
    AND payment_status = 'unpaid'
  );

DROP POLICY "Anyone can add order items" ON public.store_order_items;
CREATE POLICY "Guests can add valid order items" ON public.store_order_items FOR INSERT
  WITH CHECK (
    char_length(product_name) BETWEEN 1 AND 200
    AND quantity BETWEEN 1 AND 999
    AND unit_price >= 0 AND unit_price <= 500000
    AND line_total >= 0 AND line_total <= 500000
    AND EXISTS (SELECT 1 FROM public.store_orders o WHERE o.id = order_id AND o.created_at > now() - interval '10 minutes')
  );