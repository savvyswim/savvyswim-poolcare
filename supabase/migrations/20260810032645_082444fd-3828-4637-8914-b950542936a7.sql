CREATE TABLE public.ss_appointment_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id text NOT NULL UNIQUE,
  appointment_id text,
  customer_id uuid,
  customer_email text,
  customer_phone text,
  status text NOT NULL,
  previous_status text,
  scheduled_date date,
  arrival_window text,
  technician text,
  message text,
  notified_email boolean NOT NULL DEFAULT false,
  notified_sms boolean NOT NULL DEFAULT false,
  error text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.ss_appointment_webhook_events TO authenticated;
GRANT ALL ON public.ss_appointment_webhook_events TO service_role;

ALTER TABLE public.ss_appointment_webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view appointment webhook events"
ON public.ss_appointment_webhook_events
FOR SELECT
TO authenticated
USING (public.ss_is_staff());

CREATE TRIGGER update_ss_appointment_webhook_events_updated_at
BEFORE UPDATE ON public.ss_appointment_webhook_events
FOR EACH ROW EXECUTE FUNCTION public.ss_touch_updated_at();

CREATE INDEX idx_ss_appt_webhook_created_at ON public.ss_appointment_webhook_events (created_at DESC);