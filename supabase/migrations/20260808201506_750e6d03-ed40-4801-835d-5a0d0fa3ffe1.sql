-- ============ A. QUOTES ============
CREATE TABLE public.ss_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES public.ss_customers(id) ON DELETE SET NULL,
  lead_id uuid REFERENCES public.ss_leads(id) ON DELETE SET NULL,
  title text NOT NULL DEFAULT 'Savvy Swim proposal',
  intro text,
  hero_image_url text,
  gallery jsonb NOT NULL DEFAULT '[]'::jsonb,
  reviews jsonb NOT NULL DEFAULT '[]'::jsonb,
  show_reviews boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'draft',
  token text NOT NULL DEFAULT encode(gen_random_bytes(18), 'hex'),
  recipient_name text,
  recipient_email text,
  recipient_phone text,
  valid_until date,
  tax_pct numeric NOT NULL DEFAULT 0,
  sent_at timestamptz,
  viewed_at timestamptz,
  accepted_at timestamptz,
  accepted_by text,
  declined_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX ss_quotes_token_key ON public.ss_quotes(token);
CREATE INDEX ss_quotes_customer_idx ON public.ss_quotes(customer_id);

CREATE TABLE public.ss_quote_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES public.ss_quotes(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  image_url text,
  quantity numeric NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  is_optional boolean NOT NULL DEFAULT false,
  selected boolean NOT NULL DEFAULT true,
  recurring text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ss_quote_items_quote_idx ON public.ss_quote_items(quote_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ss_quotes TO authenticated;
GRANT ALL ON public.ss_quotes TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ss_quote_items TO authenticated;
GRANT ALL ON public.ss_quote_items TO service_role;

ALTER TABLE public.ss_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ss_quote_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "office manages quotes" ON public.ss_quotes
  FOR ALL TO authenticated USING (public.ss_is_office()) WITH CHECK (public.ss_is_office());
CREATE POLICY "staff read quotes" ON public.ss_quotes
  FOR SELECT TO authenticated USING (public.ss_is_staff());
CREATE POLICY "customer reads own quotes" ON public.ss_quotes
  FOR SELECT TO authenticated USING (customer_id IN (SELECT public.ss_my_customer_ids()));

CREATE POLICY "office manages quote items" ON public.ss_quote_items
  FOR ALL TO authenticated USING (public.ss_is_office()) WITH CHECK (public.ss_is_office());
CREATE POLICY "staff read quote items" ON public.ss_quote_items
  FOR SELECT TO authenticated USING (public.ss_is_staff());
CREATE POLICY "customer reads own quote items" ON public.ss_quote_items
  FOR SELECT TO authenticated USING (
    quote_id IN (SELECT id FROM public.ss_quotes WHERE customer_id IN (SELECT public.ss_my_customer_ids()))
  );

CREATE TRIGGER ss_quotes_updated_at BEFORE UPDATE ON public.ss_quotes
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Public (tokenised) quote read + accept
CREATE OR REPLACE FUNCTION public.ss_get_quote(_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE q public.ss_quotes; result jsonb;
BEGIN
  SELECT * INTO q FROM public.ss_quotes WHERE token = _token;
  IF NOT FOUND THEN RETURN NULL; END IF;
  SELECT jsonb_build_object(
    'title', q.title, 'intro', q.intro, 'hero_image_url', q.hero_image_url,
    'gallery', q.gallery, 'reviews', CASE WHEN q.show_reviews THEN q.reviews ELSE '[]'::jsonb END,
    'status', q.status, 'recipient_name', q.recipient_name, 'valid_until', q.valid_until,
    'tax_pct', q.tax_pct, 'accepted_at', q.accepted_at, 'accepted_by', q.accepted_by,
    'items', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', i.id, 'name', i.name, 'description', i.description, 'image_url', i.image_url,
        'quantity', i.quantity, 'unit_price', i.unit_price, 'is_optional', i.is_optional,
        'selected', i.selected, 'recurring', i.recurring
      ) ORDER BY i.sort_order, i.created_at)
      FROM public.ss_quote_items i WHERE i.quote_id = q.id
    ), '[]'::jsonb)
  ) INTO result;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.ss_mark_quote_viewed(_token text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.ss_quotes
     SET viewed_at = COALESCE(viewed_at, now()),
         status = CASE WHEN status = 'sent' THEN 'viewed' ELSE status END
   WHERE token = _token;
$$;

CREATE OR REPLACE FUNCTION public.ss_accept_quote(_token text, _signer_name text, _selected_ids uuid[])
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE q public.ss_quotes; total numeric;
BEGIN
  SELECT * INTO q FROM public.ss_quotes WHERE token = _token;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'not_found'); END IF;
  IF q.accepted_at IS NOT NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'already_accepted'); END IF;
  IF coalesce(trim(_signer_name), '') = '' THEN RETURN jsonb_build_object('ok', false, 'error', 'name_required'); END IF;

  UPDATE public.ss_quote_items
     SET selected = (id = ANY(COALESCE(_selected_ids, ARRAY[]::uuid[])))
   WHERE quote_id = q.id AND is_optional;

  SELECT COALESCE(SUM(quantity * unit_price), 0) INTO total
    FROM public.ss_quote_items WHERE quote_id = q.id AND (NOT is_optional OR selected);

  UPDATE public.ss_quotes
     SET status = 'accepted', accepted_at = now(), accepted_by = left(trim(_signer_name), 120)
   WHERE id = q.id;

  RETURN jsonb_build_object('ok', true, 'total', total);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.ss_get_quote(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.ss_mark_quote_viewed(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.ss_accept_quote(text, text, uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ss_get_quote(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ss_mark_quote_viewed(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ss_accept_quote(text, text, uuid[]) TO anon, authenticated, service_role;

-- ============ B. AUTOMATIC TIME TRACKING ============
ALTER TABLE public.ss_job_time_entries
  ADD COLUMN IF NOT EXISTS started_at timestamptz,
  ADD COLUMN IF NOT EXISTS ended_at timestamptz,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual';
CREATE INDEX IF NOT EXISTS ss_job_time_running_idx
  ON public.ss_job_time_entries(job_id) WHERE ended_at IS NULL;

-- ============ C. TWO-WAY SMS ============
CREATE TABLE public.ss_sms_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES public.ss_customers(id) ON DELETE SET NULL,
  phone text NOT NULL,
  display_name text,
  assigned_staff_id uuid REFERENCES public.ss_staff(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'open',
  unread_count integer NOT NULL DEFAULT 0,
  last_message_at timestamptz,
  last_preview text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX ss_sms_threads_phone_key ON public.ss_sms_threads(phone);

CREATE TABLE public.ss_sms_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.ss_sms_threads(id) ON DELETE CASCADE,
  direction text NOT NULL,
  body text NOT NULL,
  from_number text,
  to_number text,
  status text NOT NULL DEFAULT 'queued',
  twilio_sid text,
  sent_by uuid,
  error_detail text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ss_sms_messages_thread_idx ON public.ss_sms_messages(thread_id, created_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ss_sms_threads TO authenticated;
GRANT ALL ON public.ss_sms_threads TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ss_sms_messages TO authenticated;
GRANT ALL ON public.ss_sms_messages TO service_role;

ALTER TABLE public.ss_sms_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ss_sms_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "office manages sms threads" ON public.ss_sms_threads
  FOR ALL TO authenticated USING (public.ss_is_office()) WITH CHECK (public.ss_is_office());
CREATE POLICY "assigned tech reads own threads" ON public.ss_sms_threads
  FOR SELECT TO authenticated USING (public.ss_is_staff() AND assigned_staff_id = public.ss_my_staff_id());
CREATE POLICY "assigned tech updates own threads" ON public.ss_sms_threads
  FOR UPDATE TO authenticated
  USING (public.ss_is_staff() AND assigned_staff_id = public.ss_my_staff_id())
  WITH CHECK (public.ss_is_staff() AND assigned_staff_id = public.ss_my_staff_id());

CREATE POLICY "office manages sms messages" ON public.ss_sms_messages
  FOR ALL TO authenticated USING (public.ss_is_office()) WITH CHECK (public.ss_is_office());
CREATE POLICY "assigned tech reads thread messages" ON public.ss_sms_messages
  FOR SELECT TO authenticated USING (
    thread_id IN (SELECT id FROM public.ss_sms_threads WHERE assigned_staff_id = public.ss_my_staff_id())
  );
CREATE POLICY "assigned tech writes thread messages" ON public.ss_sms_messages
  FOR INSERT TO authenticated WITH CHECK (
    thread_id IN (SELECT id FROM public.ss_sms_threads WHERE assigned_staff_id = public.ss_my_staff_id())
  );

CREATE TRIGGER ss_sms_threads_updated_at BEFORE UPDATE ON public.ss_sms_threads
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ============ D. WORKFLOW AUTOMATIONS ============
CREATE TABLE public.ss_automations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  trigger_event text NOT NULL,
  conditions jsonb NOT NULL DEFAULT '[]'::jsonb,
  actions jsonb NOT NULL DEFAULT '[]'::jsonb,
  delay_minutes integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  run_count integer NOT NULL DEFAULT 0,
  last_run_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.ss_automation_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id uuid NOT NULL REFERENCES public.ss_automations(id) ON DELETE CASCADE,
  trigger_event text NOT NULL,
  subject_label text,
  status text NOT NULL DEFAULT 'ok',
  detail text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ss_automation_runs_idx ON public.ss_automation_runs(automation_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ss_automations TO authenticated;
GRANT ALL ON public.ss_automations TO service_role;
GRANT SELECT, INSERT ON public.ss_automation_runs TO authenticated;
GRANT ALL ON public.ss_automation_runs TO service_role;

ALTER TABLE public.ss_automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ss_automation_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "office manages automations" ON public.ss_automations
  FOR ALL TO authenticated USING (public.ss_is_office()) WITH CHECK (public.ss_is_office());
CREATE POLICY "office reads automation runs" ON public.ss_automation_runs
  FOR SELECT TO authenticated USING (public.ss_is_office());
CREATE POLICY "staff log automation runs" ON public.ss_automation_runs
  FOR INSERT TO authenticated WITH CHECK (public.ss_is_staff());

CREATE TRIGGER ss_automations_updated_at BEFORE UPDATE ON public.ss_automations
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();