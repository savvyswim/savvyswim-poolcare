
ALTER TABLE public.ss_quotes
  ADD COLUMN IF NOT EXISTS contract_template_id uuid REFERENCES public.ss_contract_templates(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.ss_build_contract_body(_quote_id uuid, _signer_name text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  q public.ss_quotes;
  tpl public.ss_contract_templates;
  total numeric;
  lines text;
  body text;
BEGIN
  SELECT * INTO q FROM public.ss_quotes WHERE id = _quote_id;
  IF NOT FOUND THEN RETURN NULL; END IF;

  SELECT COALESCE(SUM(quantity * unit_price), 0) INTO total
    FROM public.ss_quote_items WHERE quote_id = q.id AND (NOT is_optional OR selected);
  total := round(total * (1 + COALESCE(q.tax_pct, 0) / 100.0), 2);

  SELECT string_agg('• ' || name || ' × ' || quantity::text || ' — $' || to_char(quantity * unit_price, 'FM999,999,990.00'), E'\n' ORDER BY name)
    INTO lines
    FROM public.ss_quote_items
   WHERE quote_id = q.id AND (NOT is_optional OR selected);

  IF q.contract_template_id IS NOT NULL THEN
    SELECT * INTO tpl FROM public.ss_contract_templates WHERE id = q.contract_template_id;
  END IF;
  IF tpl.id IS NULL THEN
    SELECT * INTO tpl FROM public.ss_contract_templates
     WHERE is_active AND is_default ORDER BY created_at LIMIT 1;
  END IF;

  body := COALESCE(
    tpl.body,
    'SAVVY SWIM POOL SERVICE AGREEMENT' || E'\n\n' ||
    'This agreement is entered into between Savvy Swim and {{customer_name}}, based on the proposal approved on {{date}}.' || E'\n\n' ||
    'SERVICES' || E'\n{{services}}' || E'\n\n' ||
    'TOTAL: {{total}}' || E'\n\n' ||
    'TERMS' || E'\n' ||
    '1. Service is performed on the agreed recurring schedule. Savvy Swim supplies all routine chemicals and labor unless noted above.' || E'\n' ||
    '2. Billing is monthly in advance. Either party may cancel with 14 days written notice.' || E'\n' ||
    '3. Customer agrees to provide safe, unobstructed access to the pool equipment and gate area.' || E'\n' ||
    '4. Repairs, parts and non-routine chemicals are quoted separately and approved before work begins.' || E'\n\n' ||
    'By signing below, {{customer_name}} accepts the services and total shown above.'
  );

  body := replace(body, '{{customer_name}}', COALESCE(q.recipient_name, trim(COALESCE(_signer_name, q.accepted_by, ''))));
  body := replace(body, '{{services}}', COALESCE(lines, ''));
  body := replace(body, '{{total}}', '$' || to_char(total, 'FM999,999,990.00'));
  body := replace(body, '{{date}}', to_char(COALESCE(q.accepted_at, now()), 'Mon FMDD, YYYY'));

  RETURN jsonb_build_object('body', body, 'total', total, 'template_id', tpl.id, 'title', COALESCE(q.title, 'Savvy Swim service agreement'));
END;
$$;

REVOKE ALL ON FUNCTION public.ss_build_contract_body(uuid, text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.ss_accept_quote(_token text, _signer_name text, _selected_ids uuid[])
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  q public.ss_quotes;
  built jsonb;
  total numeric;
  c_id uuid;
  c_token text;
BEGIN
  SELECT * INTO q FROM public.ss_quotes WHERE token = _token;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'not_found'); END IF;
  IF q.accepted_at IS NOT NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'already_accepted'); END IF;
  IF coalesce(trim(_signer_name), '') = '' THEN RETURN jsonb_build_object('ok', false, 'error', 'name_required'); END IF;

  UPDATE public.ss_quote_items
     SET selected = (id = ANY(COALESCE(_selected_ids, ARRAY[]::uuid[])))
   WHERE quote_id = q.id AND is_optional;

  UPDATE public.ss_quotes
     SET status = 'accepted', accepted_at = now(), accepted_by = left(trim(_signer_name), 120)
   WHERE id = q.id;

  built := public.ss_build_contract_body(q.id, _signer_name);
  total := (built->>'total')::numeric;

  SELECT id, token INTO c_id, c_token FROM public.ss_contracts WHERE quote_id = q.id;

  IF c_id IS NULL THEN
    INSERT INTO public.ss_contracts (
      customer_id, lead_id, quote_id, template_id, title, body, status,
      recipient_name, recipient_email, recipient_phone, sent_at, expires_at,
      merge_data, created_by
    ) VALUES (
      q.customer_id, q.lead_id, q.id, NULLIF(built->>'template_id','')::uuid,
      COALESCE(q.title, 'Savvy Swim service agreement'),
      built->>'body', 'sent',
      COALESCE(q.recipient_name, trim(_signer_name)), q.recipient_email, q.recipient_phone,
      now(), now() + interval '30 days',
      jsonb_build_object('quote_id', q.id, 'total', total, 'source', 'quote_accepted'),
      q.created_by
    )
    RETURNING id, token INTO c_id, c_token;

    INSERT INTO public.ss_contract_events (contract_id, event, detail)
    VALUES (c_id, 'created', 'Auto-generated from approved proposal');
  END IF;

  RETURN jsonb_build_object('ok', true, 'total', total, 'contract_token', c_token, 'contract_id', c_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.ss_tg_quote_template_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.contract_template_id IS DISTINCT FROM OLD.contract_template_id THEN
    PERFORM public.ss_sync_quote_contract(NEW.id);
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS ss_quotes_template_sync ON public.ss_quotes;
CREATE TRIGGER ss_quotes_template_sync
AFTER UPDATE ON public.ss_quotes
FOR EACH ROW EXECUTE FUNCTION public.ss_tg_quote_template_sync();
