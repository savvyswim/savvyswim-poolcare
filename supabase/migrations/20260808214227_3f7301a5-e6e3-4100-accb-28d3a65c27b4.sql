ALTER TABLE public.ss_inventory
  ADD COLUMN IF NOT EXISTS sku text,
  ADD COLUMN IF NOT EXISTS barcode text;

UPDATE public.ss_inventory
SET sku = 'SS-' || upper(substr(replace(id::text, '-', ''), 1, 8))
WHERE sku IS NULL OR sku = '';

CREATE UNIQUE INDEX IF NOT EXISTS ss_inventory_sku_key ON public.ss_inventory (sku) WHERE sku IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS ss_inventory_barcode_key ON public.ss_inventory (barcode) WHERE barcode IS NOT NULL;