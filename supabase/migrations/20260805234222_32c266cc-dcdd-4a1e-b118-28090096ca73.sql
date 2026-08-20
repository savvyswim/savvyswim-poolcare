ALTER TABLE public.contact_events
  ADD COLUMN IF NOT EXISTS campaign_id text,
  ADD COLUMN IF NOT EXISTS utm_source text,
  ADD COLUMN IF NOT EXISTS utm_medium text,
  ADD COLUMN IF NOT EXISTS utm_campaign text,
  ADD COLUMN IF NOT EXISTS utm_term text,
  ADD COLUMN IF NOT EXISTS utm_content text,
  ADD COLUMN IF NOT EXISTS landing_page text;

CREATE SEQUENCE IF NOT EXISTS public.inspection_ref_seq START 1001;

CREATE TABLE IF NOT EXISTS public.inspection_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_number text NOT NULL DEFAULT ('SS-' || to_char(now(), 'YY') || '-' || nextval('public.inspection_ref_seq')),
  full_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  address text NOT NULL,
  postal_code text NOT NULL,
  preferred_date date,
  vehicle_details text,
  preferred_contact_time text,
  notes text,
  sms_opt_in boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'new',
  campaign_id text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_term text,
  utm_content text,
  page_path text,
  landing_page text,
  referrer text,
  session_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.inspection_requests TO anon, authenticated;
GRANT SELECT ON public.inspection_requests TO authenticated;
GRANT ALL ON public.inspection_requests TO service_role;
GRANT USAGE ON SEQUENCE public.inspection_ref_seq TO anon, authenticated, service_role;

ALTER TABLE public.inspection_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can submit an inspection request" ON public.inspection_requests;
CREATE POLICY "Anyone can submit an inspection request"
  ON public.inspection_requests FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Staff can view inspection requests" ON public.inspection_requests;
CREATE POLICY "Staff can view inspection requests"
  ON public.inspection_requests FOR SELECT TO authenticated
  USING (
    public.ss_is_staff()
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::public.app_role
    )
  );

DROP TRIGGER IF EXISTS inspection_requests_updated_at ON public.inspection_requests;
CREATE TRIGGER inspection_requests_updated_at
  BEFORE UPDATE ON public.inspection_requests
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();