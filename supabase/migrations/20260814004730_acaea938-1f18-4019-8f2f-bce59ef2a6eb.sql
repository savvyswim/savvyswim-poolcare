
CREATE TABLE IF NOT EXISTS public.ss_sms_consent (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL UNIQUE,
  opted_in boolean NOT NULL DEFAULT false,
  consent_text text,
  consent_source text,
  consent_url text,
  consented_at timestamptz,
  revoked_at timestamptz,
  last_help_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.ss_sms_consent TO authenticated;
GRANT ALL ON public.ss_sms_consent TO service_role;

ALTER TABLE public.ss_sms_consent ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='ss_sms_consent' AND policyname='Staff can view sms consent'
  ) THEN
    CREATE POLICY "Staff can view sms consent"
      ON public.ss_sms_consent FOR SELECT TO authenticated
      USING (public.ss_is_office());
  END IF;
END $$;

ALTER TABLE public.inspection_requests ALTER COLUMN sms_opt_in SET DEFAULT false;
ALTER TABLE public.bookings ALTER COLUMN sms_opt_in SET DEFAULT false;
