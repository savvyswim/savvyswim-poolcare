DROP POLICY "Guests can place a valid order" ON public.store_orders;
DROP POLICY "Guests can add valid order items" ON public.store_order_items;
REVOKE INSERT ON public.store_orders FROM anon;
REVOKE INSERT ON public.store_order_items FROM anon;

CREATE OR REPLACE FUNCTION public.place_store_order(
  p_customer_name text,
  p_email text,
  p_phone text,
  p_address text,
  p_city text,
  p_state text,
  p_postal_code text,
  p_notes text,
  p_items jsonb
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.store_orders%ROWTYPE;
  v_item jsonb;
  v_product public.products%ROWTYPE;
  v_qty integer;
  v_subtotal numeric(10,2) := 0;
  v_tax numeric(10,2);
  v_shipping numeric(10,2);
BEGIN
  IF char_length(coalesce(p_customer_name,'')) < 2 OR char_length(p_customer_name) > 120 THEN
    RAISE EXCEPTION 'Invalid name';
  END IF;
  IF coalesce(p_email,'') !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'Invalid email';
  END IF;
  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 OR jsonb_array_length(p_items) > 50 THEN
    RAISE EXCEPTION 'Invalid cart';
  END IF;

  INSERT INTO public.store_orders (customer_name, email, phone, address, city, state, postal_code, notes)
  VALUES (
    p_customer_name,
    p_email,
    nullif(left(coalesce(p_phone,''), 40), ''),
    nullif(left(coalesce(p_address,''), 300), ''),
    nullif(left(coalesce(p_city,''), 120), ''),
    nullif(left(coalesce(p_state,''), 60), ''),
    nullif(left(coalesce(p_postal_code,''), 20), ''),
    nullif(left(coalesce(p_notes,''), 2000), '')
  )
  RETURNING * INTO v_order;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_qty := greatest(1, least(999, coalesce((v_item->>'quantity')::int, 1)));
    SELECT * INTO v_product FROM public.products
      WHERE id = nullif(v_item->>'product_id','')::uuid AND is_active = true;
    IF v_product.id IS NULL THEN
      CONTINUE;
    END IF;
    INSERT INTO public.store_order_items (order_id, product_id, product_name, sku, unit_price, quantity, line_total)
    VALUES (v_order.id, v_product.id, v_product.name, v_product.sku, v_product.price, v_qty, v_product.price * v_qty);
    v_subtotal := v_subtotal + v_product.price * v_qty;
  END LOOP;

  IF v_subtotal <= 0 THEN
    DELETE FROM public.store_orders WHERE id = v_order.id;
    RAISE EXCEPTION 'No valid products in cart';
  END IF;

  v_tax := round(v_subtotal * 0.0825, 2);
  v_shipping := CASE WHEN v_subtotal >= 500 THEN 0 ELSE 39 END;

  UPDATE public.store_orders
    SET subtotal = v_subtotal, tax = v_tax, shipping = v_shipping, total = v_subtotal + v_tax + v_shipping
    WHERE id = v_order.id;

  RETURN v_order.order_number;
END;
$$;

REVOKE ALL ON FUNCTION public.place_store_order(text,text,text,text,text,text,text,text,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.place_store_order(text,text,text,text,text,text,text,text,jsonb) TO anon, authenticated;