SET check_function_bodies = off;
CREATE OR REPLACE FUNCTION public.ss_save_quote_picks(_token text, _selected_ids uuid[])
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_id uuid;
BEGIN
  SELECT id INTO v_id FROM public.ss_quotes
   WHERE token = _token AND trashed_at IS NULL AND accepted_at IS NULL;
  IF v_id IS NULL THEN RETURN; END IF;

  UPDATE public.ss_quote_items
     SET selected = (id = ANY(COALESCE(_selected_ids, ARRAY[]::uuid[])))
   WHERE quote_id = v_id AND is_optional = true;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.ss_set_gate_access(_customer_id uuid, _gate_code text DEFAULT NULL::text, _dog_name text DEFAULT NULL::text, _location_notes text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_is_staff boolean := public.ss_is_staff();
  v_is_owner boolean;
  v_name text;
  v_role text;
  v_old text;
  v_new text;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Not signed in');
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.ss_customers c
    WHERE c.id = _customer_id
      AND (c.user_id = v_uid OR c.id IN (SELECT public.ss_my_customer_ids()))
  ) INTO v_is_owner;

  IF NOT (v_is_owner OR v_is_staff) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Not allowed to edit this gate access');
  END IF;

  IF v_is_staff THEN
    SELECT s.full_name, COALESCE(s.level::text, 'staff')
      INTO v_name, v_role
      FROM public.ss_staff s
     WHERE s.user_id = v_uid
     LIMIT 1;
  END IF;

  IF v_name IS NULL THEN
    SELECT c.full_name INTO v_name FROM public.ss_customers c WHERE c.id = _customer_id;
    v_role := COALESCE(v_role, 'customer');
  END IF;

  SELECT c.gate_code INTO v_old FROM public.ss_customers c WHERE c.id = _customer_id;
  v_new := NULLIF(LEFT(TRIM(COALESCE(_gate_code, '')), 40), '');

  UPDATE public.ss_customers SET
    gate_code      = v_new,
    dog_name       = NULLIF(LEFT(TRIM(COALESCE(_dog_name, '')), 80), ''),
    location_notes = NULLIF(LEFT(TRIM(COALESCE(_location_notes, '')), 1000), ''),
    gate_code_updated_at      = now(),
    gate_code_updated_by      = v_uid,
    gate_code_updated_by_name = COALESCE(v_name, 'Someone'),
    gate_code_updated_by_role = COALESCE(v_role, 'customer')
  WHERE id = _customer_id;

  INSERT INTO public.admin_audit_log (user_id, area, action, record_type, record_id, details)
  VALUES (
    v_uid, 'gate_access', 'update', 'ss_customers', _customer_id::text,
    jsonb_build_object(
      'changed_by', COALESCE(v_name, 'Someone'),
      'role', COALESCE(v_role, 'customer'),
      'gate_code_changed', (COALESCE(v_old, '') IS DISTINCT FROM COALESCE(v_new, '')),
      'dog_name', NULLIF(TRIM(COALESCE(_dog_name, '')), ''),
      'location_notes', NULLIF(TRIM(COALESCE(_location_notes, '')), '')
    )
  );

  RETURN jsonb_build_object(
    'ok', true,
    'updated_by', COALESCE(v_name, 'Someone'),
    'role', COALESCE(v_role, 'customer'),
    'updated_at', now()
  );
END;
$function$
;
CREATE OR REPLACE FUNCTION public.ss_settle_check_payment(p_check_id uuid, p_status text, p_amount numeric DEFAULT NULL::numeric, p_check_number text DEFAULT NULL::text, p_note text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  ck public.ss_check_payments%ROWTYPE;
  v_status text := lower(btrim(coalesce(p_status, '')));
  v_amount numeric;
  v_payment_id uuid;
  v_posted boolean := false;
BEGIN
  IF NOT public.ss_can_finance() THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;
  IF v_status NOT IN ('received', 'cleared', 'bounced', 'void') THEN
    RAISE EXCEPTION 'Unknown status';
  END IF;

  SELECT * INTO ck FROM public.ss_check_payments WHERE id = p_check_id;
  IF ck.id IS NULL THEN RAISE EXCEPTION 'Check not found'; END IF;

  v_amount := coalesce(p_amount, ck.amount, 0);
  v_payment_id := ck.posted_payment_id;

  -- The money counts the moment the office has the check in hand. It is
  -- posted once: a later "cleared" only changes the paperwork.
  IF v_status IN ('received', 'cleared') AND v_payment_id IS NULL THEN
    INSERT INTO public.ss_payments (invoice_id, customer_id, amount, kind, method, note)
    VALUES (ck.invoice_id, ck.customer_id, v_amount, 'payment', 'check',
      'Check received' || coalesce(' #' || coalesce(nullif(btrim(coalesce(p_check_number, '')), ''), ck.check_number), ''))
    RETURNING id INTO v_payment_id;
    v_posted := true;
  ELSIF v_status IN ('received', 'cleared') AND v_payment_id IS NOT NULL THEN
    UPDATE public.ss_payments SET amount = v_amount WHERE id = v_payment_id;
  ELSIF v_status IN ('bounced', 'void') AND v_payment_id IS NOT NULL THEN
    DELETE FROM public.ss_payments WHERE id = v_payment_id;
    v_payment_id := NULL;
  END IF;

  UPDATE public.ss_check_payments
     SET status = v_status,
         amount = v_amount,
         posted_payment_id = v_payment_id,
         check_number = coalesce(nullif(btrim(coalesce(p_check_number, '')), ''), check_number),
         note = coalesce(nullif(btrim(left(coalesce(p_note, ''), 240)), ''), note),
         received_at = CASE WHEN v_status IN ('received', 'cleared') THEN coalesce(received_at, now()) ELSE received_at END,
         cleared_at = CASE WHEN v_status = 'cleared' THEN now() ELSE NULL END,
         handled_by = auth.uid(),
         updated_at = now()
   WHERE id = ck.id;

  PERFORM public.ss_recalc_invoice_paid(ck.invoice_id);

  IF v_posted THEN
    INSERT INTO public.ss_feed (customer_id, kind, title, body)
    VALUES (ck.customer_id, 'payment', 'Check received',
      '$' || to_char(v_amount, 'FM999999990.00') || ' received, thank you!');
  END IF;

  RETURN jsonb_build_object('id', ck.id, 'status', v_status, 'amount', v_amount, 'posted', v_posted);
END;
$function$
;
CREATE OR REPLACE FUNCTION public.ss_sla_effective_config(p_lead uuid, p_customer uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  base jsonb := public.ss_task_sla_config();
  ov public.ss_sla_rules%ROWTYPE;
BEGIN
  IF p_lead IS NOT NULL THEN
    SELECT * INTO ov FROM public.ss_sla_rules WHERE lead_id = p_lead LIMIT 1;
  END IF;
  IF ov.id IS NULL AND p_customer IS NOT NULL THEN
    SELECT * INTO ov FROM public.ss_sla_rules WHERE customer_id = p_customer LIMIT 1;
  END IF;

  base := base || jsonb_build_object('channels', COALESCE(base->'channels',
    '{"in_app": true, "email": false, "sms": false}'::jsonb), 'override', false);

  IF ov.id IS NULL THEN
    RETURN base;
  END IF;

  IF ov.enabled IS NOT TRUE THEN
    RETURN base || jsonb_build_object('enabled', false, 'override', true, 'override_id', ov.id);
  END IF;

  RETURN base
    || jsonb_strip_nulls(jsonb_build_object(
         'warn_hours', ov.warn_hours,
         'escalate_hours', ov.escalate_hours,
         'reassign_hours', ov.reassign_hours,
         'fallback_user_id', ov.fallback_user_id,
         'notify_office', ov.notify_office))
    || jsonb_build_object('channels', ov.channels, 'override', true,
                          'override_id', ov.id, 'override_label', ov.label);
END;
$function$
;
CREATE OR REPLACE FUNCTION public.ss_sla_notify(p_key text, p_user uuid, p_task uuid, p_channels jsonb, p_vars jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  tpl public.ss_sla_templates%ROWTYPE;
  title text;
  body text;
  k text;
  v text;
  recipient_email text;
  recipient_phone text;
  prefs record;
BEGIN
  IF p_user IS NULL THEN RETURN; END IF;
  SELECT * INTO tpl FROM public.ss_sla_templates WHERE key = p_key;
  IF tpl.key IS NULL OR tpl.enabled IS NOT TRUE THEN RETURN; END IF;

  title := tpl.title_tpl;
  body := tpl.body_tpl;
  FOR k, v IN SELECT key, COALESCE(value #>> '{}', '') FROM jsonb_each(p_vars) LOOP
    title := replace(title, '{' || k || '}', v);
    body := replace(body, '{' || k || '}', v);
  END LOOP;

  SELECT email, phone INTO recipient_email, recipient_phone
    FROM public.ss_staff WHERE user_id = p_user LIMIT 1;
  SELECT lead_sla_in_app, lead_sla_email, lead_sla_sms, sms_number INTO prefs
    FROM public.ss_notification_prefs WHERE user_id = p_user LIMIT 1;

  -- In-app
  IF COALESCE((tpl.channels->>'in_app')::boolean, true)
     AND COALESCE((p_channels->>'in_app')::boolean, true)
     AND COALESCE(prefs.lead_sla_in_app, true) THEN
    INSERT INTO public.ss_notifications (user_id, kind, title, body, link)
    VALUES (p_user, 'task_sla', title, body, '/admin/crm/task-sla');
  END IF;

  -- Email
  IF COALESCE((tpl.channels->>'email')::boolean, false)
     AND COALESCE((p_channels->>'email')::boolean, false)
     AND COALESCE(prefs.lead_sla_email, true)
     AND recipient_email IS NOT NULL THEN
    INSERT INTO public.ss_sla_alerts (task_id, user_id, channel, template_key, recipient, subject, body)
    VALUES (p_task, p_user, 'email', p_key, recipient_email, title, body);
  END IF;

  -- SMS
  IF COALESCE((tpl.channels->>'sms')::boolean, false)
     AND COALESCE((p_channels->>'sms')::boolean, false)
     AND COALESCE(prefs.lead_sla_sms, true)
     AND COALESCE(NULLIF(prefs.sms_number, ''), recipient_phone) IS NOT NULL THEN
    INSERT INTO public.ss_sla_alerts (task_id, user_id, channel, template_key, recipient, subject, body)
    VALUES (p_task, p_user, 'sms', p_key,
            COALESCE(NULLIF(prefs.sms_number, ''), recipient_phone), title, title || ', ' || body);
  END IF;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.ss_sync_quote_care_to_customer()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_filter public.ss_quote_items;
  v_salt public.ss_quote_items;
  v_sanitizer text;
BEGIN
  IF NEW.customer_id IS NULL OR NEW.accepted_at IS NULL THEN RETURN NEW; END IF;

  SELECT * INTO v_filter
  FROM public.ss_quote_items
  WHERE quote_id = NEW.id
    AND (NOT is_optional OR selected)
    AND lower(name) LIKE 'filter cleaning%'
  ORDER BY sort_order LIMIT 1;

  SELECT * INTO v_salt
  FROM public.ss_quote_items
  WHERE quote_id = NEW.id
    AND (NOT is_optional OR selected)
    AND lower(name) LIKE 'salt cell cleaning%'
  ORDER BY sort_order LIMIT 1;

  SELECT lower(coalesce(sanitizer, '')) INTO v_sanitizer
  FROM public.ss_customers WHERE id = NEW.customer_id;

  UPDATE public.ss_customers
  SET filter_clean_included = v_filter.id IS NOT NULL,
      filter_clean_price = coalesce(v_filter.unit_price, filter_clean_price, 35),
      filter_clean_charge_type = CASE
        WHEN v_filter.id IS NULL THEN 'none'
        WHEN v_filter.recurring = 'per_service' THEN 'per_service'
        ELSE 'monthly'
      END,
      salt_cell_included = v_salt.id IS NOT NULL AND v_sanitizer = 'salt',
      salt_cell_price = CASE WHEN v_sanitizer = 'salt' THEN coalesce(v_salt.unit_price, salt_cell_price, 15) ELSE salt_cell_price END,
      salt_cell_quantity = CASE WHEN v_sanitizer = 'salt' THEN greatest(1, least(2, coalesce(v_salt.quantity, 1)::integer)) ELSE 1 END,
      salt_cell_charge_type = CASE
        WHEN v_sanitizer <> 'salt' OR v_salt.id IS NULL THEN 'none'
        WHEN v_salt.recurring = 'per_service' THEN 'per_service'
        ELSE 'monthly'
      END
  WHERE id = NEW.customer_id;

  RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.ss_task_sla_config()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(
    (SELECT value FROM public.ss_settings WHERE key = 'task_sla'),
    jsonb_build_object('enabled', true, 'warn_hours', 0, 'escalate_hours', 4,
                       'reassign_hours', 24, 'fallback_user_id', null, 'notify_office', true)
  );
$function$
;
CREATE OR REPLACE FUNCTION public.ss_tg_backup_mark()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _entity text := TG_ARGV[0];
BEGIN
  INSERT INTO public.ss_backup_sync (entity, record_id, dirty, updated_at)
  VALUES (_entity, NEW.id, true, now())
  ON CONFLICT (entity, record_id)
  DO UPDATE SET dirty = true, updated_at = now();
  RETURN NEW;
END;
$function$
;