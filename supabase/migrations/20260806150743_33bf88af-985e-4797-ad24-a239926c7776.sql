CREATE TABLE public.ss_review_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(12), 'hex'),
  customer_name text NOT NULL,
  phone text,
  message text,
  photos jsonb NOT NULL DEFAULT '[]'::jsonb,
  google_url text NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  opened_at timestamptz,
  clicked_at timestamptz
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ss_review_requests TO authenticated;
GRANT ALL ON public.ss_review_requests TO service_role;

ALTER TABLE public.ss_review_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff manage review requests"
ON public.ss_review_requests FOR ALL TO authenticated
USING (public.ss_is_staff()) WITH CHECK (public.ss_is_staff());

CREATE OR REPLACE FUNCTION public.ss_get_review_request(_token text)
RETURNS TABLE (customer_name text, message text, photos jsonb, google_url text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.ss_review_requests r SET opened_at = COALESCE(r.opened_at, now())
  WHERE r.token = _token;

  RETURN QUERY
  SELECT r.customer_name, r.message, r.photos, r.google_url
  FROM public.ss_review_requests r
  WHERE r.token = _token;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.ss_get_review_request(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ss_get_review_request(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.ss_mark_review_clicked(_token text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.ss_review_requests SET clicked_at = COALESCE(clicked_at, now()) WHERE token = _token;
$$;

REVOKE EXECUTE ON FUNCTION public.ss_mark_review_clicked(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ss_mark_review_clicked(text) TO anon, authenticated;