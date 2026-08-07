ALTER TABLE public.ss_bundles
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'Residential Income',
  ADD COLUMN IF NOT EXISTS billing text NOT NULL DEFAULT 'monthly',
  ADD COLUMN IF NOT EXISTS show_item_prices boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS price_mode text NOT NULL DEFAULT 'sum',
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;