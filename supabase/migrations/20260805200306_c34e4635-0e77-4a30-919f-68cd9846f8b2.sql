ALTER TABLE public.ss_city_rates
  ADD COLUMN IF NOT EXISTS market_avg numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS market_note text;

UPDATE public.ss_city_rates
SET market_avg = ROUND(((low + high) / 2) * 1.12)
WHERE market_avg = 0;