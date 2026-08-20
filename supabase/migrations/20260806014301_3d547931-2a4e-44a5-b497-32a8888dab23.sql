-- (historical, already applied) inspection date column normalized to preferred_date
ALTER TABLE public.inspection_requests RENAME COLUMN pool_details TO pool_details;