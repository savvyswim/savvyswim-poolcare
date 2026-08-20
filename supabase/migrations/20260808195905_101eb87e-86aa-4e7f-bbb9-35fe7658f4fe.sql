CREATE TABLE public.ss_condition_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.ss_customers(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'standard',
  occurred_on date,
  notes text NOT NULL DEFAULT '',
  photos jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'submitted',
  office_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.ss_condition_reports TO authenticated;
GRANT ALL ON public.ss_condition_reports TO service_role;

ALTER TABLE public.ss_condition_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers manage their own condition reports"
ON public.ss_condition_reports FOR SELECT TO authenticated
USING (customer_id = public.ss_my_customer_id() OR public.ss_is_staff());

CREATE POLICY "Customers submit their own condition reports"
ON public.ss_condition_reports FOR INSERT TO authenticated
WITH CHECK (customer_id = public.ss_my_customer_id() OR public.ss_is_staff());

CREATE POLICY "Staff update condition reports"
ON public.ss_condition_reports FOR UPDATE TO authenticated
USING (public.ss_is_staff()) WITH CHECK (public.ss_is_staff());

CREATE TRIGGER ss_condition_reports_updated_at
BEFORE UPDATE ON public.ss_condition_reports
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE INDEX ss_condition_reports_customer_idx ON public.ss_condition_reports (customer_id, created_at DESC);

CREATE POLICY "Customers upload own archived service photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'service-photos-archive'
  AND (storage.foldername(name))[1] = public.ss_my_customer_id()::text
);

CREATE POLICY "Customers read own archived service photos"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'service-photos-archive'
  AND ((storage.foldername(name))[1] = public.ss_my_customer_id()::text OR public.ss_is_staff())
);

CREATE POLICY "Staff manage archived service photos"
ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'service-photos-archive' AND public.ss_is_staff())
WITH CHECK (bucket_id = 'service-photos-archive' AND public.ss_is_staff());