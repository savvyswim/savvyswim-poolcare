CREATE TABLE public.shop_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name text NOT NULL,
  email text NOT NULL,
  phone text,
  address text,
  item_name text NOT NULL,
  item_sku text,
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric(10,2),
  order_type text NOT NULL DEFAULT 'product',
  notes text,
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.shop_orders TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shop_orders TO authenticated;
GRANT ALL ON public.shop_orders TO service_role;

ALTER TABLE public.shop_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit an order request"
  ON public.shop_orders FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can view orders"
  ON public.shop_orders FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update orders"
  ON public.shop_orders FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete orders"
  ON public.shop_orders FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'));