CREATE TABLE public.promo_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  description text NOT NULL DEFAULT '',
  discount_type text NOT NULL DEFAULT 'percent' CHECK (discount_type IN ('percent','fixed')),
  discount_value numeric(10,2) NOT NULL DEFAULT 0 CHECK (discount_value >= 0),
  min_subtotal numeric(10,2) NOT NULL DEFAULT 0 CHECK (min_subtotal >= 0),
  max_redemptions integer,
  times_used integer NOT NULL DEFAULT 0,
  starts_at timestamptz,
  expires_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX promo_codes_code_key ON public.promo_codes (upper(code));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.promo_codes TO authenticated;
GRANT ALL ON public.promo_codes TO service_role;

ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage promo codes" ON public.promo_codes
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER promo_codes_updated_at BEFORE UPDATE ON public.promo_codes
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

ALTER TABLE public.store_orders
  ADD COLUMN discount numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN promo_code text;

CREATE OR REPLACE FUNCTION public.check_promo_code(p_code text, p_subtotal numeric)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v public.promo_codes%ROWTYPE;
  v_discount numeric(10,2);
BEGIN
  IF coalesce(p_subtotal, 0) <= 0 THEN
    RETURN jsonb_build_object('valid', false, 'message', 'Add items to your cart first');
  END IF;

  SELECT * INTO v FROM public.promo_codes
    WHERE upper(code) = upper(btrim(coalesce(p_code, ''))) AND is_active = true;

  IF v.id IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'message', 'That code is not valid');
  END IF;
  IF v.starts_at IS NOT NULL AND now() < v.starts_at THEN
    RETURN jsonb_build_object('valid', false, 'message', 'That code is not active yet');
  END IF;
  IF v.expires_at IS NOT NULL AND now() > v.expires_at THEN
    RETURN jsonb_build_object('valid', false, 'message', 'That code has expired');
  END IF;
  IF v.max_redemptions IS NOT NULL AND v.times_used >= v.max_redemptions THEN
    RETURN jsonb_build_object('valid', false, 'message', 'That code has been fully redeemed');
  END IF;
  IF p_subtotal < v.min_subtotal THEN
    RETURN jsonb_build_object('valid', false, 'message',
      'Order subtotal must be at least $' || to_char(v.min_subtotal, 'FM999999990.00'));
  END IF;

  IF v.discount_type = 'percent' THEN
    v_discount := round(p_subtotal * least(v.discount_value, 100) / 100, 2);
  ELSE
    v_discount := least(v.discount_value, p_subtotal);
  END IF;

  RETURN jsonb_build_object(
    'valid', true,
    'code', upper(v.code),
    'discount', v_discount,
    'description', v.description,
    'message', 'Code applied'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.check_promo_code(text, numeric) FROM public;
GRANT EXECUTE ON FUNCTION public.check_promo_code(text, numeric) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.place_store_order(p_customer_name text, p_email text, p_phone text, p_address text, p_city text, p_state text, p_postal_code text, p_notes text, p_items jsonb, p_promo_code text DEFAULT NULL)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_order public.store_orders%ROWTYPE;
  v_item jsonb;
  v_product public.products%ROWTYPE;
  v_qty integer;
  v_subtotal numeric(10,2) := 0;
  v_tax numeric(10,2);
  v_shipping numeric(10,2);
  v_discount numeric(10,2) := 0;
  v_promo jsonb;
  v_promo_code text := NULL;
  v_taxable numeric(10,2);
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

  IF nullif(btrim(coalesce(p_promo_code,'')), '') IS NOT NULL THEN
    v_promo := public.check_promo_code(p_promo_code, v_subtotal);
    IF (v_promo->>'valid')::boolean THEN
      v_discount := least((v_promo->>'discount')::numeric, v_subtotal);
      v_promo_code := v_promo->>'code';
      UPDATE public.promo_codes SET times_used = times_used + 1
        WHERE upper(code) = v_promo_code;
    END IF;
  END IF;

  v_taxable := greatest(v_subtotal - v_discount, 0);
  v_tax := round(v_taxable * 0.0825, 2);
  v_shipping := CASE WHEN v_subtotal >= 500 THEN 0 ELSE 39 END;

  UPDATE public.store_orders
    SET subtotal = v_subtotal,
        discount = v_discount,
        promo_code = v_promo_code,
        tax = v_tax,
        shipping = v_shipping,
        total = v_taxable + v_tax + v_shipping
    WHERE id = v_order.id;

  RETURN v_order.order_number;
END;
$function$;

REVOKE ALL ON FUNCTION public.place_store_order(text,text,text,text,text,text,text,text,jsonb,text) FROM public;
GRANT EXECUTE ON FUNCTION public.place_store_order(text,text,text,text,text,text,text,text,jsonb,text) TO anon, authenticated, service_role;

DROP FUNCTION IF EXISTS public.place_store_order(text,text,text,text,text,text,text,text,jsonb);