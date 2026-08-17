UPDATE public.inspection_requests SET status = 'new' WHERE status IS NULL OR status NOT IN ('new','scheduled','confirmed','declined','converted');

ALTER TABLE public.inspection_requests ALTER COLUMN status SET DEFAULT 'new';
ALTER TABLE public.inspection_requests ALTER COLUMN status SET NOT NULL;

ALTER TABLE public.inspection_requests DROP CONSTRAINT IF EXISTS inspection_requests_status_check;
ALTER TABLE public.inspection_requests ADD CONSTRAINT inspection_requests_status_check
  CHECK (status IN ('new','scheduled','confirmed','declined','converted'));

CREATE INDEX IF NOT EXISTS inspection_requests_status_idx ON public.inspection_requests (status, created_at DESC);