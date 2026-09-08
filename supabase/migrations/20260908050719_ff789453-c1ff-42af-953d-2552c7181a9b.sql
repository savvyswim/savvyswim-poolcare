REVOKE SELECT ON public.ss_site_reviews FROM anon, authenticated;
GRANT SELECT (id, rating, body, author_name, author_city, status, featured, source, page_path, created_at, approved_at) ON public.ss_site_reviews TO anon, authenticated;
GRANT ALL ON public.ss_site_reviews TO service_role;