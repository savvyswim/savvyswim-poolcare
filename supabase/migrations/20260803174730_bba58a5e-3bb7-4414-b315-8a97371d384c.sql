ALTER TABLE public.service_pricing ADD COLUMN IF NOT EXISTS plan_name text;

UPDATE public.service_pricing SET plan_name =
  CASE
    WHEN vegetation_rank = 1 THEN pool_size || ' Pool – Savvy Pure Blue'
    WHEN vegetation_rank = 2 THEN pool_size || ' Pool – Savvy Liquid Glass'
    ELSE pool_size || ' Pool – Savvy Zero-Debris'
  END;

UPDATE public.service_pricing SET vegetation_level =
  CASE
    WHEN vegetation_rank = 1 THEN 'No Vegetation'
    WHEN vegetation_rank = 2 THEN 'Medium Vegetation'
    ELSE 'Heavy Vegetation'
  END;