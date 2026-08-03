-- CONTACTS
CREATE TABLE public.crm_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text,
  phone text,
  address text,
  city text,
  company text,
  source text NOT NULL DEFAULT 'website',
  tags text[] NOT NULL DEFAULT '{}',
  marketing_opt_in boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX crm_contacts_email_key ON public.crm_contacts (lower(email)) WHERE email IS NOT NULL;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_contacts TO authenticated;
GRANT ALL ON public.crm_contacts TO service_role;
ALTER TABLE public.crm_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage contacts" ON public.crm_contacts FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER crm_contacts_updated_at BEFORE UPDATE ON public.crm_contacts
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- LEADS
CREATE TABLE public.crm_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid REFERENCES public.crm_contacts(id) ON DELETE CASCADE,
  title text NOT NULL,
  service_interest text,
  pool_size text,
  vegetation_level text,
  stage text NOT NULL DEFAULT 'new',
  priority text NOT NULL DEFAULT 'normal',
  estimated_value numeric(10,2),
  quoted_price numeric(10,2),
  owner_id uuid,
  source text NOT NULL DEFAULT 'website',
  next_follow_up date,
  booking_id uuid,
  notes text,
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX crm_leads_stage_idx ON public.crm_leads (stage, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_leads TO authenticated;
GRANT ALL ON public.crm_leads TO service_role;
ALTER TABLE public.crm_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage leads" ON public.crm_leads FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER crm_leads_updated_at BEFORE UPDATE ON public.crm_leads
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ACTIVITIES
CREATE TABLE public.crm_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid REFERENCES public.crm_contacts(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'note',
  subject text,
  body text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX crm_activities_lead_idx ON public.crm_activities (lead_id, occurred_at DESC);
CREATE INDEX crm_activities_contact_idx ON public.crm_activities (contact_id, occurred_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_activities TO authenticated;
GRANT ALL ON public.crm_activities TO service_role;
ALTER TABLE public.crm_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage activities" ON public.crm_activities FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

-- TASKS
CREATE TABLE public.crm_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid REFERENCES public.crm_contacts(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  title text NOT NULL,
  details text,
  due_date date,
  is_done boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  assigned_to uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX crm_tasks_due_idx ON public.crm_tasks (is_done, due_date);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_tasks TO authenticated;
GRANT ALL ON public.crm_tasks TO service_role;
ALTER TABLE public.crm_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage tasks" ON public.crm_tasks FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER crm_tasks_updated_at BEFORE UPDATE ON public.crm_tasks
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- AUTO-CAPTURE BOOKINGS INTO THE CRM
CREATE OR REPLACE FUNCTION public.tg_booking_to_crm()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contact_id uuid;
  v_lead_id uuid;
BEGIN
  SELECT id INTO v_contact_id FROM public.crm_contacts
    WHERE email IS NOT NULL AND lower(email) = lower(NEW.email) LIMIT 1;

  IF v_contact_id IS NULL THEN
    INSERT INTO public.crm_contacts (full_name, email, phone, address, source, marketing_opt_in)
    VALUES (NEW.name, NEW.email, NEW.phone, NEW.address, 'booking form', coalesce(NEW.sms_opt_in, false))
    RETURNING id INTO v_contact_id;
  ELSE
    UPDATE public.crm_contacts
      SET phone = coalesce(nullif(NEW.phone, ''), phone),
          address = coalesce(nullif(NEW.address, ''), address),
          marketing_opt_in = marketing_opt_in OR coalesce(NEW.sms_opt_in, false)
      WHERE id = v_contact_id;
  END IF;

  INSERT INTO public.crm_leads (contact_id, title, service_interest, source, booking_id, notes, next_follow_up)
  VALUES (v_contact_id, coalesce(nullif(NEW.service, ''), 'Service request'), NEW.service,
          'booking form', NEW.id, NEW.notes, NEW.preferred_date)
  RETURNING id INTO v_lead_id;

  INSERT INTO public.crm_activities (contact_id, lead_id, type, subject, body)
  VALUES (v_contact_id, v_lead_id, 'booking',
          'Booking request submitted',
          'Preferred: ' || NEW.preferred_date::text || ' ' || NEW.preferred_time ||
          coalesce(' — ' || NEW.notes, ''));

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.tg_booking_to_crm() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER bookings_to_crm AFTER INSERT ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.tg_booking_to_crm();