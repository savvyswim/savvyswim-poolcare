
-- Build contract body text from a quote's current selected line items
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

  SELECT * INTO tpl FROM public.ss_contract_templates
   WHERE is_active AND is_default ORDER BY created_at LIMIT 1;

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

-- Re-sync any unsigned contract linked to a quote
CREATE OR REPLACE FUNCTION public.ss_sync_quote_contract(_quote_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  c public.ss_contracts;
  built jsonb;
  old_total numeric;
  new_total numeric;
BEGIN
  SELECT * INTO c FROM public.ss_contracts
   WHERE quote_id = _quote_id
     AND signed_at IS NULL AND declined_at IS NULL AND voided_at IS NULL
     AND status NOT IN ('signed','declined','voided')
   LIMIT 1;
  IF NOT FOUND THEN RETURN; END IF;

  built := public.ss_build_contract_body(_quote_id, c.signer_name);
  IF built IS NULL THEN RETURN; END IF;

  new_total := (built->>'total')::numeric;
  old_total := NULLIF(c.merge_data->>'total', '')::numeric;

  IF c.body IS NOT DISTINCT FROM (built->>'body') AND old_total IS NOT DISTINCT FROM new_total THEN
    RETURN;
  END IF;

  UPDATE public.ss_contracts
     SET body = built->>'body',
         title = COALESCE(title, built->>'title'),
         merge_data = COALESCE(merge_data, '{}'::jsonb)
                      || jsonb_build_object('total', new_total, 'resynced_at', now()),
         signing_started_at = NULL,
         status = CASE WHEN status IN ('draft') THEN status ELSE 'sent' END,
         expires_at = now() + interval '30 days',
         updated_at = now()
   WHERE id = c.id;

  INSERT INTO public.ss_contract_events (contract_id, event, detail)
  VALUES (c.id, 'updated',
    'Regenerated from proposal changes'
    || CASE WHEN old_total IS DISTINCT FROM new_total
            THEN ' — total $' || to_char(COALESCE(old_total,0), 'FM999,999,990.00') || ' → $' || to_char(new_total, 'FM999,999,990.00')
            ELSE '' END);
END;
$$;

REVOKE ALL ON FUNCTION public.ss_sync_quote_contract(uuid) FROM PUBLIC, anon, authenticated;

-- Triggers
CREATE OR REPLACE FUNCTION public.ss_tg_quote_item_sync_contract()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM public.ss_sync_quote_contract(COALESCE(NEW.quote_id, OLD.quote_id));
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS ss_quote_items_sync_contract ON public.ss_quote_items;
CREATE TRIGGER ss_quote_items_sync_contract
AFTER INSERT OR UPDATE OR DELETE ON public.ss_quote_items
FOR EACH ROW EXECUTE FUNCTION public.ss_tg_quote_item_sync_contract();

CREATE OR REPLACE FUNCTION public.ss_tg_quote_sync_contract()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.tax_pct IS DISTINCT FROM OLD.tax_pct
     OR NEW.title IS DISTINCT FROM OLD.title
     OR NEW.recipient_name IS DISTINCT FROM OLD.recipient_name THEN
    PERFORM public.ss_sync_quote_contract(NEW.id);
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS ss_quotes_sync_contract ON public.ss_quotes;
CREATE TRIGGER ss_quotes_sync_contract
AFTER UPDATE ON public.ss_quotes
FOR EACH ROW EXECUTE FUNCTION public.ss_tg_quote_sync_contract();
