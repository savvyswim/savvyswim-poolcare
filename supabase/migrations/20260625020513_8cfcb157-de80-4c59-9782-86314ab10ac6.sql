
DO $$ BEGIN
  CREATE TYPE public.pool_category AS ENUM ('design', 'plan', 'construction');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.pool_media_type AS ENUM ('image', 'video');
EXCEPTION WHEN duplicate_object THEN null; END $$;

ALTER TABLE public.pool_designs
  ADD COLUMN IF NOT EXISTS category public.pool_category NOT NULL DEFAULT 'design',
  ADD COLUMN IF NOT EXISTS media_type public.pool_media_type NOT NULL DEFAULT 'image',
  ADD COLUMN IF NOT EXISTS stage_order integer;

CREATE INDEX IF NOT EXISTS pool_designs_category_idx ON public.pool_designs(category);
