CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  sku text NOT NULL UNIQUE,
  description text NOT NULL DEFAULT '',
  price numeric(10,2) NOT NULL DEFAULT 0,
  compare_at_price numeric(10,2),
  image_key text,
  image_url text,
  category text NOT NULL DEFAULT 'general',
  stock_quantity integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  featured boolean NOT NULL DEFAULT false,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Active products are public" ON public.products FOR SELECT USING (is_active = true OR private.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage products" ON public.products FOR ALL TO authenticated USING (private.has_role(auth.uid(), 'admin')) WITH CHECK (private.has_role(auth.uid(), 'admin'));

CREATE SEQUENCE public.store_order_number_seq START 1001;
GRANT USAGE ON SEQUENCE public.store_order_number_seq TO anon, authenticated, service_role;

CREATE TABLE public.store_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text NOT NULL UNIQUE DEFAULT ('SS-' || nextval('public.store_order_number_seq')::text),
  customer_name text NOT NULL,
  email text NOT NULL,
  phone text,
  address text,
  city text,
  state text,
  postal_code text,
  subtotal numeric(10,2) NOT NULL DEFAULT 0,
  tax numeric(10,2) NOT NULL DEFAULT 0,
  shipping numeric(10,2) NOT NULL DEFAULT 0,
  total numeric(10,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'new',
  payment_status text NOT NULL DEFAULT 'unpaid',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT store_orders_name_len CHECK (char_length(customer_name) BETWEEN 2 AND 120),
  CONSTRAINT store_orders_email_len CHECK (char_length(email) BETWEEN 5 AND 200),
  CONSTRAINT store_orders_notes_len CHECK (notes IS NULL OR char_length(notes) <= 2000)
);
GRANT INSERT ON public.store_orders TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_orders TO authenticated;
GRANT ALL ON public.store_orders TO service_role;
ALTER TABLE public.store_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can place an order" ON public.store_orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins read orders" ON public.store_orders FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update orders" ON public.store_orders FOR UPDATE TO authenticated USING (private.has_role(auth.uid(), 'admin')) WITH CHECK (private.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete orders" ON public.store_orders FOR DELETE TO authenticated USING (private.has_role(auth.uid(), 'admin'));

CREATE TABLE public.store_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.store_orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  sku text,
  unit_price numeric(10,2) NOT NULL DEFAULT 0,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity BETWEEN 1 AND 999),
  line_total numeric(10,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX store_order_items_order_id_idx ON public.store_order_items(order_id);
GRANT INSERT ON public.store_order_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_order_items TO authenticated;
GRANT ALL ON public.store_order_items TO service_role;
ALTER TABLE public.store_order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can add order items" ON public.store_order_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins read order items" ON public.store_order_items FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage order items" ON public.store_order_items FOR DELETE TO authenticated USING (private.has_role(auth.uid(), 'admin'));

CREATE TRIGGER products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER store_orders_updated_at BEFORE UPDATE ON public.store_orders FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

INSERT INTO public.products (name, slug, sku, description, price, image_key, category, stock_quantity, featured, display_order) VALUES
('AquaGlide Robotic Cleaner','aquaglide-robotic-cleaner','SS-ROB-01','Cordless robot that scrubs floor, walls, and waterline in 90 minutes.',899,'robot','equipment',12,true,1),
('Crystal Chem Season Kit','crystal-chem-season-kit','SS-CHEM-04','Chlorine tabs, shock, algaecide, clarifier, and a pro test kit.',189,'chemicals','chemicals',40,false,2),
('Variable-Speed Pump 1.65HP','variable-speed-pump-165','SS-PMP-165','Energy-saving pump that typically cuts pool power bills by half.',1149,'pump','equipment',8,true,3),
('Pro Maintenance Tool Set','pro-maintenance-tool-set','SS-TOOL-07','Telescopic pole, leaf rake, vacuum head, and wall brush.',129,'tools','tools',25,false,4);