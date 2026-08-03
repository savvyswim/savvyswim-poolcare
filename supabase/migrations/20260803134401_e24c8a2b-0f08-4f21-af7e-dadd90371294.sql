CREATE TABLE public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  address text NOT NULL,
  service text NOT NULL,
  preferred_date date NOT NULL,
  preferred_time text NOT NULL,
  notes text,
  sms_opt_in boolean NOT NULL DEFAULT false,
  sms_consent_at timestamptz,
  sms_consent_text text,
  consent_source_url text,
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.bookings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bookings TO authenticated;
GRANT ALL ON public.bookings TO service_role;

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit a valid booking"
  ON public.bookings FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    length(btrim(name)) >= 2 AND length(btrim(name)) <= 80
    AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' AND length(email) <= 200
    AND length(btrim(phone)) >= 7 AND length(btrim(phone)) <= 30
    AND length(btrim(address)) >= 4 AND length(btrim(address)) <= 200
    AND length(btrim(service)) >= 1 AND length(btrim(service)) <= 120
    AND length(btrim(preferred_time)) >= 1 AND length(btrim(preferred_time)) <= 40
    AND COALESCE(length(notes), 0) <= 1000
    AND status = 'new'
  );

CREATE POLICY "Admins can view bookings"
  ON public.bookings FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update bookings"
  ON public.bookings FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete bookings"
  ON public.bookings FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role));