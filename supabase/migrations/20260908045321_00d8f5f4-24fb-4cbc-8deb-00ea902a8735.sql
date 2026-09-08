-- Customer reviews collected on savvyswimservices.com.
-- Nothing is public until office staff approve it.

CREATE TABLE IF NOT EXISTS public.ss_site_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rating smallint NOT NULL DEFAULT 5,
  body text NOT NULL DEFAULT '',
  author_name text NOT NULL DEFAULT '',
  author_city text,
  contact_email text,
  status text NOT NULL DEFAULT 'pending',
  featured boolean NOT NULL DEFAULT false,
  source text NOT NULL DEFAULT 'web',
  page_path text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  approved_at timestamptz,
  CONSTRAINT ss_site_reviews_rating_range CHECK (rating BETWEEN 1 AND 5),
  CONSTRAINT ss_site_reviews_status_valid CHECK (status IN ('pending', 'approved', 'hidden')),
  CONSTRAINT ss_site_reviews_source_valid CHECK (source IN ('web', 'staff'))
);

CREATE INDEX IF NOT EXISTS ss_site_reviews_public_idx
  ON public.ss_site_reviews (status, featured DESC, created_at DESC);

GRANT SELECT ON public.ss_site_reviews TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ss_site_reviews TO authenticated;
GRANT ALL ON public.ss_site_reviews TO service_role;

ALTER TABLE public.ss_site_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Approved reviews are public" ON public.ss_site_reviews;
CREATE POLICY "Approved reviews are public"
  ON public.ss_site_reviews
  FOR SELECT
  TO anon, authenticated
  USING (status = 'approved');

DROP POLICY IF EXISTS "Staff read every review" ON public.ss_site_reviews;
CREATE POLICY "Staff read every review"
  ON public.ss_site_reviews
  FOR SELECT
  TO authenticated
  USING (public.ss_is_staff());

DROP POLICY IF EXISTS "Office manage reviews" ON public.ss_site_reviews;
CREATE POLICY "Office manage reviews"
  ON public.ss_site_reviews
  FOR ALL
  TO authenticated
  USING (public.ss_is_office())
  WITH CHECK (public.ss_is_office());

DROP TRIGGER IF EXISTS ss_site_reviews_touch ON public.ss_site_reviews;
CREATE TRIGGER ss_site_reviews_touch
  BEFORE UPDATE ON public.ss_site_reviews
  FOR EACH ROW EXECUTE FUNCTION public.ss_touch_updated_at();