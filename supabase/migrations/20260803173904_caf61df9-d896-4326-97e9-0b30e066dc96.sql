CREATE TABLE public.service_pricing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_size text NOT NULL,
  size_rank int NOT NULL DEFAULT 1,
  vegetation_level text NOT NULL,
  vegetation_rank int NOT NULL DEFAULT 1,
  sku text NOT NULL UNIQUE,
  price numeric(10,2),
  price_key text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.service_pricing TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_pricing TO authenticated;
GRANT ALL ON public.service_pricing TO service_role;

ALTER TABLE public.service_pricing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active pricing"
ON public.service_pricing FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins manage pricing"
ON public.service_pricing FOR ALL
TO authenticated
USING (private.has_role(auth.uid(), 'admin'))
WITH CHECK (private.has_role(auth.uid(), 'admin'));

CREATE TRIGGER service_pricing_updated_at
BEFORE UPDATE ON public.service_pricing
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

INSERT INTO public.service_pricing (pool_size, size_rank, vegetation_level, vegetation_rank, sku, price, price_key, is_active) VALUES
('Small', 1, 'No Trees / Vegetation', 1, '101 SS-S-NV', 120, 'ss_s_nv_monthly', true),
('Small', 1, 'Medium Vegetation', 2, '101 SS-S-MV', 155, 'ss_s_mv_monthly', true),
('Small', 1, 'Large Vegetation', 3, '101 SS-S-LV', 175, 'ss_s_lv_monthly', true),
('Medium', 2, 'No Trees / Vegetation', 1, '101 SS-M-NV', 145, 'ss_m_nv_monthly', true),
('Medium', 2, 'Medium Vegetation', 2, '101 SS-M-MV', 175, 'ss_m_mv_monthly', true),
('Medium', 2, 'Large / Extra Vegetation', 3, '101 SS-M-LV', 190, 'ss_m_lv_monthly', true),
('Large', 3, 'No Trees / Vegetation', 1, '101 SS-L-NV', 175, 'ss_l_nv_monthly', true),
('Large', 3, 'Medium Vegetation', 2, '101 SS-L-MV', 195, 'ss_l_mv_monthly', true),
('Large', 3, 'Large / Lot of Vegetation', 3, '101 SS-L-LV', 225, 'ss_l_lv_monthly', true),
('Extra Large', 4, 'No Trees / Vegetation', 1, '101 SS-XL-NV', NULL, NULL, false),
('Extra Large', 4, 'Medium Vegetation', 2, '101 SS-XL-MV', NULL, NULL, false),
('Extra Large', 4, 'Large Vegetation', 3, '101 SS-XL-LV', NULL, NULL, false);