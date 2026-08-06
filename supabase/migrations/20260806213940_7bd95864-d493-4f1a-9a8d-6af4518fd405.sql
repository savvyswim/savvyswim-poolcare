CREATE TABLE public.ss_contract_sms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES public.ss_contracts(id) ON DELETE CASCADE,
  to_phone text NOT NULL,
  message_sid text UNIQUE,
  status text NOT NULL DEFAULT 'queued',
  error_message text,
  sent_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.ss_contract_sms TO authenticated;
GRANT ALL ON public.ss_contract_sms TO service_role;

ALTER TABLE public.ss_contract_sms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Office can view contract sms" ON public.ss_contract_sms
FOR SELECT TO authenticated USING (public.ss_is_office());

CREATE POLICY "Office can insert contract sms" ON public.ss_contract_sms
FOR INSERT TO authenticated WITH CHECK (public.ss_is_office());

CREATE POLICY "Office can update contract sms" ON public.ss_contract_sms
FOR UPDATE TO authenticated USING (public.ss_is_office()) WITH CHECK (public.ss_is_office());

CREATE INDEX ss_contract_sms_contract_idx ON public.ss_contract_sms(contract_id, created_at DESC);

CREATE TRIGGER ss_contract_sms_updated_at
BEFORE UPDATE ON public.ss_contract_sms
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();