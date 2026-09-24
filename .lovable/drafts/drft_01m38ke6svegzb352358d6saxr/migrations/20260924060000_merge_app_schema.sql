SET check_function_bodies = off;
-- Functions from the SavvySwim app
CREATE OR REPLACE FUNCTION public.ss_add_recurring_invoice_lines(_invoice uuid, _customer uuid, _month date)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  c public.ss_customers;
  v_filter numeric := 0;
  v_salt numeric := 0;
  v_base numeric := 0;
BEGIN
  SELECT * INTO c FROM public.ss_customers WHERE id = _customer;
  IF NOT FOUND THEN RETURN; END IF;

  IF c.filter_clean_charge_type = 'monthly' THEN
    v_filter := round(coalesce(c.filter_clean_price, 0), 2);
  END IF;
  IF c.salt_cell_charge_type = 'monthly' AND lower(coalesce(c.sanitizer, '')) = 'salt' THEN
    v_salt := round(coalesce(c.salt_cell_price, 0) * greatest(1, coalesce(c.salt_cell_quantity, 1)), 2);
  END IF;
  v_base := greatest(0, round(coalesce(c.monthly_price, 0) - v_filter - v_salt, 2));

  IF v_base > 0 THEN
    INSERT INTO public.ss_invoice_items (invoice_id, description, quantity, unit_price, line_total)
    VALUES (
      _invoice,
      'Pool service, ' || to_char(_month, 'FMMonth YYYY') ||
        CASE WHEN c.filter_clean_charge_type = 'included' AND c.salt_cell_charge_type = 'included' THEN ' (includes filter care and salt cell care)'
             WHEN c.filter_clean_charge_type = 'included' THEN ' (includes filter care)'
             WHEN c.salt_cell_charge_type = 'included' THEN ' (includes salt cell care)'
             ELSE '' END,
      1, v_base, v_base
    );
  END IF;
  IF v_filter > 0 THEN
    INSERT INTO public.ss_invoice_items (invoice_id, description, quantity, unit_price, line_total)
    VALUES (_invoice, 'Filter cleaning plan, every ' || coalesce(c.filter_interval_days, 120) || ' days', 1, v_filter, v_filter);
  END IF;
  IF v_salt > 0 THEN
    INSERT INTO public.ss_invoice_items (invoice_id, description, quantity, unit_price, line_total)
    VALUES (_invoice, 'Salt cell cleaning plan, every ' || coalesce(c.salt_cell_interval_days, 120) || ' days', greatest(1, coalesce(c.salt_cell_quantity, 1)), round(coalesce(c.salt_cell_price, 0), 2), v_salt);
  END IF;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.ss_apply_visit_late_fees()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  cfg jsonb;
  grace int;
  fee numeric(10,2);
  n int := 0;
BEGIN
  SELECT value INTO cfg FROM public.ss_settings WHERE key = 'visit_late_fee';
  grace := coalesce((cfg->>'grace_days')::int, 10);
  fee := coalesce((cfg->>'fee_amount')::numeric, 15);

  IF fee <= 0 THEN
    RETURN 0;
  END IF;

  UPDATE public.ss_visits
     SET late_fee = fee,
         late_fee_applied_at = now(),
         updated_at = now()
   WHERE status = 'completed'
     AND payment_status IN ('unpaid', 'partial')
     AND late_fee_applied_at IS NULL
     AND service_amount > 0
     AND scheduled_date < current_date - grace;

  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.ss_approve_access_request(_request_id uuid, _approve boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_row public.ss_access_requests;
  v_customer uuid;
  v_actor_email text;
BEGIN
  IF NOT public.ss_is_office() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Office access required');
  END IF;

  SELECT * INTO v_row FROM public.ss_access_requests WHERE id = _request_id FOR UPDATE;
  IF v_row.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Request not found');
  END IF;
  IF v_row.status <> 'pending' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Request already reviewed');
  END IF;

  SELECT email INTO v_actor_email FROM auth.users WHERE id = auth.uid();

  IF NOT _approve THEN
    UPDATE public.ss_access_requests
       SET status = 'denied', reviewed_by = auth.uid(), reviewed_at = now()
     WHERE id = _request_id;

    INSERT INTO public.admin_audit_log (user_id, user_email, area, action, record_type, record_id, details)
    VALUES (auth.uid(), v_actor_email, 'access_requests', 'deny', 'ss_access_requests', _request_id::text,
            jsonb_build_object('email', v_row.email, 'address', v_row.address));

    INSERT INTO public.ss_notifications (user_id, kind, title, body)
    VALUES (v_row.user_id, 'access', 'Access request declined',
            'Your Savvy Swim account request was not approved. Contact the office if you think this is a mistake.');

    RETURN jsonb_build_object('ok', true, 'status', 'denied');
  END IF;

  SELECT id INTO v_customer FROM public.ss_customers WHERE user_id = v_row.user_id LIMIT 1;

  IF v_customer IS NULL THEN
    INSERT INTO public.ss_customers (user_id, full_name, email, phone, address, city, state, postal_code, status)
    VALUES (v_row.user_id, v_row.full_name, v_row.email, v_row.phone, v_row.address, v_row.city, v_row.state, v_row.postal_code, 'active')
    RETURNING id INTO v_customer;
  END IF;

  IF COALESCE(v_row.address, '') <> '' AND NOT EXISTS (
    SELECT 1 FROM public.ss_service_addresses
     WHERE customer_id = v_customer AND lower(address) = lower(v_row.address)
  ) THEN
    INSERT INTO public.ss_service_addresses (customer_id, label, address, city, state, postal_code, is_default)
    VALUES (v_customer, 'Home', v_row.address, v_row.city, v_row.state, v_row.postal_code, true);
  END IF;

  UPDATE public.ss_access_requests
     SET status = 'approved', reviewed_by = auth.uid(), reviewed_at = now(), customer_id = v_customer
   WHERE id = _request_id;

  INSERT INTO public.admin_audit_log (user_id, user_email, area, action, record_type, record_id, details)
  VALUES (auth.uid(), v_actor_email, 'access_requests', 'approve', 'ss_access_requests', _request_id::text,
          jsonb_build_object('email', v_row.email, 'address', v_row.address, 'customer_id', v_customer));

  INSERT INTO public.ss_notifications (user_id, kind, title, body)
  VALUES (v_row.user_id, 'access', 'Your portal access is approved',
          'Welcome to Savvy Swim. Your service address has been linked to your account.');

  RETURN jsonb_build_object('ok', true, 'status', 'approved', 'customer_id', v_customer);
END;
$function$
;
CREATE OR REPLACE FUNCTION public.ss_can_claim_customer(_customer_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT _customer_id IS NULL OR EXISTS (
    SELECT 1
    FROM public.ss_customers c, auth.users u
    WHERE c.id = _customer_id
      AND u.id = auth.uid()
      AND (
        (c.email IS NOT NULL AND u.email IS NOT NULL AND lower(c.email) = lower(u.email))
        OR (c.user_id IS NOT NULL AND c.user_id = auth.uid())
        OR (c.phone IS NOT NULL AND u.phone IS NOT NULL
            AND regexp_replace(c.phone, '\D', '', 'g') = regexp_replace(u.phone, '\D', '', 'g'))
      )
  );
$function$
;
CREATE OR REPLACE FUNCTION public.ss_can_finance()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT public.ss_is_owner()
      OR EXISTS (
        SELECT 1 FROM public.ss_staff s
         WHERE s.user_id = auth.uid()
           AND s.is_active
           AND s.level = 'office_manager'
           AND s.finance_access
      )
$function$
;
CREATE OR REPLACE FUNCTION public.ss_claim_by_contact(_full_name text, _email text, _phone text, _address text, _city text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _cust public.ss_customers%ROWTYPE;
  _norm text;
BEGIN
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_signed_in');
  END IF;

  -- Already linked? Nothing to do.
  SELECT * INTO _cust FROM public.ss_customers WHERE user_id = _uid LIMIT 1;
  IF FOUND THEN
    RETURN jsonb_build_object('ok', true, 'status', 'linked', 'customer_id', _cust.id);
  END IF;

  _norm := public.ss_norm_address(COALESCE(_address, ''));

  SELECT * INTO _cust
  FROM public.ss_customers c
  WHERE c.user_id IS NULL
    AND (
      (_email IS NOT NULL AND lower(c.email) = lower(_email))
      OR (_norm <> '' AND public.ss_norm_address(COALESCE(c.address, '')) = _norm)
    )
  ORDER BY (lower(COALESCE(c.email, '')) = lower(COALESCE(_email, ''))) DESC
  LIMIT 1;

  IF FOUND THEN
    UPDATE public.ss_customers
       SET user_id = _uid,
           email = COALESCE(email, _email),
           phone = COALESCE(phone, _phone),
           updated_at = now()
     WHERE id = _cust.id;
    RETURN jsonb_build_object('ok', true, 'status', 'linked', 'customer_id', _cust.id);
  END IF;

  INSERT INTO public.ss_access_requests (user_id, email, full_name, phone, address, city, status)
  VALUES (_uid, _email, _full_name, _phone, COALESCE(_address, ''), _city, 'pending')
  ON CONFLICT DO NOTHING;

  RETURN jsonb_build_object('ok', true, 'status', 'pending');
END;
$function$
;
CREATE OR REPLACE FUNCTION public.ss_claim_staff_by_email()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_email text;
  v_staff uuid;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false);
  END IF;

  IF EXISTS (SELECT 1 FROM public.ss_staff WHERE user_id = v_uid) THEN
    RETURN jsonb_build_object('ok', true, 'claimed', false);
  END IF;

  SELECT lower(email) INTO v_email FROM auth.users WHERE id = v_uid;
  IF v_email IS NULL THEN
    RETURN jsonb_build_object('ok', false);
  END IF;

  UPDATE public.ss_staff
     SET user_id = v_uid
   WHERE user_id IS NULL
     AND lower(email) = v_email
     AND is_active
  RETURNING id INTO v_staff;

  RETURN jsonb_build_object('ok', true, 'claimed', v_staff IS NOT NULL, 'staff_id', v_staff);
END;
$function$
;
CREATE OR REPLACE FUNCTION public.ss_clear_service_hold(_customer_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT (public.ss_is_office() OR public.ss_is_owner()) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;
  UPDATE public.ss_customers
     SET service_hold_at = NULL, service_hold_reason = NULL
   WHERE id = _customer_id;
  UPDATE public.ss_invoices SET hold_at = NULL, updated_at = now()
   WHERE customer_id = _customer_id AND hold_at IS NOT NULL;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.ss_confirm_customer(_customer_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.ss_is_office() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Not allowed');
  END IF;
  UPDATE public.ss_customers
     SET needs_review = false,
         reviewed_at = now(),
         reviewed_by = auth.uid(),
         status = CASE WHEN status = 'prospect'::public.ss_cust_status THEN 'active'::public.ss_cust_status ELSE status END,
         became_customer_at = COALESCE(became_customer_at, now())
   WHERE id = _customer_id;
  RETURN jsonb_build_object('ok', true);
END;
$function$
;
CREATE OR REPLACE FUNCTION public.ss_confirm_portal_payment(p_payment_id uuid, p_confirm boolean DEFAULT true)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  pay public.ss_payments%ROWTYPE;
BEGIN
  IF NOT public.ss_is_office() THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  SELECT * INTO pay FROM public.ss_payments WHERE id = p_payment_id;
  IF pay.id IS NULL THEN RAISE EXCEPTION 'Payment not found'; END IF;

  IF p_confirm THEN
    UPDATE public.ss_payments
       SET confirmed_at = coalesce(confirmed_at, now()), confirmed_by = auth.uid()
     WHERE id = pay.id;
    PERFORM public.ss_recalc_invoice_paid(pay.invoice_id);
    RETURN jsonb_build_object('id', pay.id, 'confirmed', true, 'amount', pay.amount);
  END IF;

  DELETE FROM public.ss_payments WHERE id = pay.id;
  PERFORM public.ss_recalc_invoice_paid(pay.invoice_id);

  IF pay.customer_id IS NOT NULL THEN
    INSERT INTO public.ss_feed (customer_id, kind, title, body)
    VALUES (pay.customer_id, 'payment', 'Payment could not be verified',
      '$' || to_char(pay.amount, 'FM999999990.00') || ' · ' || pay.method
      || ', we could not find this payment, so the balance is back on your account. Please call the office.');
  END IF;

  RETURN jsonb_build_object('id', pay.id, 'confirmed', false, 'amount', pay.amount);
END;
$function$
;
CREATE OR REPLACE FUNCTION public.ss_declare_check_payment(p_invoice_id uuid, p_delivery text DEFAULT 'mail'::text, p_check_number text DEFAULT NULL::text, p_note text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  inv public.ss_invoices%ROWTYPE;
  c public.ss_customers%ROWTYPE;
  v_delivery text := lower(btrim(coalesce(p_delivery, 'mail')));
  v_id uuid;
BEGIN
  IF v_delivery NOT IN ('mail', 'tech') THEN
    RAISE EXCEPTION 'Choose how the check is delivered';
  END IF;

  SELECT * INTO inv FROM public.ss_invoices WHERE id = p_invoice_id;
  IF inv.id IS NULL THEN RAISE EXCEPTION 'Invoice not found'; END IF;

  SELECT * INTO c FROM public.ss_customers
   WHERE id = inv.customer_id AND user_id = auth.uid();
  IF c.id IS NULL THEN RAISE EXCEPTION 'Invoice not found'; END IF;

  IF inv.status = 'paid' THEN RAISE EXCEPTION 'This invoice is already paid'; END IF;

  INSERT INTO public.ss_check_payments (invoice_id, customer_id, amount, check_number, delivery, note)
  VALUES (
    inv.id,
    c.id,
    greatest(coalesce(inv.amount, 0) - coalesce(inv.amount_paid, 0), 0),
    nullif(btrim(left(coalesce(p_check_number, ''), 40)), ''),
    v_delivery,
    nullif(btrim(left(coalesce(p_note, ''), 240)), '')
  )
  RETURNING id INTO v_id;

  UPDATE public.ss_invoices SET status = 'processing', updated_at = now()
   WHERE id = inv.id AND status NOT IN ('paid', 'partial', 'void');

  INSERT INTO public.ss_feed (customer_id, kind, title, body)
  VALUES (c.id, 'payment', 'Check on the way for ' || inv.invoice_number,
    CASE WHEN v_delivery = 'mail' THEN 'Mailed check' ELSE 'Check for your technician' END
    || coalesce(' · #' || nullif(btrim(coalesce(p_check_number, '')), ''), '')
    || ', we will mark it paid once it clears.');

  INSERT INTO public.ss_alerts (customer_id, tech_id, priority, title, body)
  VALUES (c.id, c.assigned_tech_id, 'normal', 'Check payment declared, ' || c.full_name,
    inv.invoice_number || ' · ' || v_delivery);

  RETURN jsonb_build_object('id', v_id, 'status', 'pending');
END;
$function$
;
CREATE OR REPLACE FUNCTION public.ss_generate_monthly_invoices(_month date DEFAULT (date_trunc('month'::text, (CURRENT_DATE)::timestamp with time zone))::date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_month date := date_trunc('month', coalesce(_month, CURRENT_DATE))::date;
  c record;
  v_last date;
  v_due date;
  v_inv uuid;
  v_num text;
  v_amount numeric;
  v_made int := 0;
  v_skipped int := 0;
  v_created jsonb := '[]'::jsonb;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT (public.ss_is_office() OR public.ss_is_owner()) THEN RAISE EXCEPTION 'Not allowed'; END IF;
  FOR c IN SELECT id, full_name, email, monthly_price, billing_anchor_date FROM public.ss_customers
    WHERE status = 'active' AND coalesce(monthly_price, 0) > 0
  LOOP
    SELECT max(issued_on) INTO v_last FROM public.ss_invoices
     WHERE customer_id = c.id AND kind = 'recurring' AND status <> 'void';
    IF v_last IS NOT NULL AND v_last > CURRENT_DATE - 27 THEN
      v_skipped := v_skipped + 1; CONTINUE;
    END IF;
    v_due := public.ss_next_due_date(c.billing_anchor_date, CURRENT_DATE);
    v_amount := round(c.monthly_price::numeric, 2);
    INSERT INTO public.ss_invoices (customer_id, amount, kind, status, issued_on, due_date, period_month)
    VALUES (c.id, v_amount, 'recurring', 'not_paid', CURRENT_DATE, v_due, v_month)
    RETURNING id, invoice_number INTO v_inv, v_num;
    PERFORM public.ss_add_recurring_invoice_lines(v_inv, c.id, v_month);
    v_created := v_created || jsonb_build_object('invoice_id', v_inv, 'customer_id', c.id, 'invoice_number', v_num, 'amount', v_amount, 'due_date', v_due, 'email', c.email, 'full_name', c.full_name);
    v_made := v_made + 1;
  END LOOP;
  RETURN jsonb_build_object('month', v_month, 'created', v_made, 'already_billed', v_skipped, 'invoices', v_created);
END;
$function$
;
CREATE OR REPLACE FUNCTION public.ss_get_cancellation_context(p_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_contract record;
  v_req record;
  v_addr text;
BEGIN
  SELECT c.id, c.title, c.status, c.signed_at, c.activated_at, c.voided_at,
         c.recipient_name, c.customer_id
    INTO v_contract
  FROM public.ss_contracts c
  WHERE c.token = p_token
  LIMIT 1;

  IF v_contract.id IS NULL THEN
    RETURN jsonb_build_object('found', false);
  END IF;

  SELECT concat_ws(', ', nullif(cu.address,''), nullif(cu.city,''), nullif(cu.state,'')) INTO v_addr
  FROM public.ss_customers cu WHERE cu.id = v_contract.customer_id;

  SELECT r.reference, r.status, r.reason, r.requested_at, r.effective_date
    INTO v_req
  FROM public.ss_cancellation_requests r
  WHERE r.contract_id = v_contract.id AND r.status <> 'withdrawn'
  ORDER BY r.created_at DESC
  LIMIT 1;

  RETURN jsonb_build_object(
    'found', true,
    'title', v_contract.title,
    'status', v_contract.status,
    'recipient_name', v_contract.recipient_name,
    'service_address', v_addr,
    'signed', v_contract.signed_at IS NOT NULL,
    'voided', v_contract.voided_at IS NOT NULL,
    'earliest_effective_date', (current_date + 30),
    'request', CASE WHEN v_req.reference IS NULL THEN NULL ELSE jsonb_build_object(
      'reference', v_req.reference,
      'status', v_req.status,
      'reason', v_req.reason,
      'requested_at', v_req.requested_at,
      'effective_date', v_req.effective_date
    ) END
  );
END;
$function$
;
CREATE OR REPLACE FUNCTION public.ss_guard_finance_access()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.finance_access AND NOT public.ss_is_owner() THEN
      NEW.finance_access := false;
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.finance_access IS DISTINCT FROM OLD.finance_access AND NOT public.ss_is_owner() THEN
    RAISE EXCEPTION 'Only the owner can change finance permission';
  END IF;
  RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.ss_lead_is_resolved(_lead ss_leads)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT _lead.stage IN ('won','lost')
      OR _lead.converted_customer_id IS NOT NULL
      OR EXISTS (
        SELECT 1 FROM public.inspection_requests r
        WHERE _lead.intake_channel = 'inspection'
          AND _lead.intake_ref IS NOT NULL
          AND r.id::text = _lead.intake_ref::text
          AND lower(coalesce(r.status,'')) IN ('scheduled','completed','converted')
      )
      OR EXISTS (
        SELECT 1 FROM public.ss_visits v
        WHERE v.customer_id = _lead.converted_customer_id
      )
$function$
;
CREATE OR REPLACE FUNCTION public.ss_lead_sla_config()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(
    (SELECT value FROM public.ss_settings WHERE key = 'lead_sla'),
    jsonb_build_object('first_response_hours', 2, 'followup_hours', 24, 'max_reminders', 5)
  )
$function$
;
CREATE OR REPLACE FUNCTION public.ss_log_contact_event(p_event_type text, p_placement text DEFAULT NULL::text, p_page_path text DEFAULT NULL::text, p_referrer text DEFAULT NULL::text, p_session_id text DEFAULT NULL::text, p_user_agent text DEFAULT NULL::text, p_campaign_id text DEFAULT NULL::text, p_utm jsonb DEFAULT '{}'::jsonb, p_landing_page text DEFAULT NULL::text, p_full_name text DEFAULT NULL::text, p_phone text DEFAULT NULL::text, p_email text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_event_id uuid;
  v_ref uuid;
  v_lead public.ss_leads%ROWTYPE;
  v_label text;
  v_note text;
  v_name text;
  v_customer uuid;
BEGIN
  IF p_event_type NOT IN ('call_click','text_click','booking_click','show_number_click','copy_number_click','email_click','signup_start','signup_schedule_view','signup_date_picked','signup_paid') THEN
    RAISE EXCEPTION 'invalid event type';
  END IF;

  INSERT INTO public.contact_events (
    event_type, placement, page_path, referrer, session_id, user_agent,
    campaign_id, utm_source, utm_medium, utm_campaign, utm_term, utm_content, landing_page
  ) VALUES (
    p_event_type,
    left(p_placement, 120),
    left(p_page_path, 300),
    left(p_referrer, 500),
    left(p_session_id, 100),
    left(p_user_agent, 500),
    left(p_campaign_id, 120),
    left(p_utm->>'utm_source', 120),
    left(p_utm->>'utm_medium', 120),
    left(p_utm->>'utm_campaign', 120),
    left(p_utm->>'utm_term', 120),
    left(p_utm->>'utm_content', 120),
    left(p_landing_page, 300)
  ) RETURNING id INTO v_event_id;

  -- Reveal / copy clicks and sign-up funnel steps are measurement only: they
  -- must not create pipeline noise.
  IF p_event_type IN ('show_number_click','copy_number_click','signup_start','signup_schedule_view','signup_date_picked','signup_paid') THEN
    RETURN jsonb_build_object('event_id', v_event_id, 'lead_id', NULL, 'customer_id', NULL);
  END IF;

  v_customer := public.ss_touch_customer_attribution(
    p_email, p_phone, p_event_type, p_placement, p_campaign_id, p_landing_page, p_page_path
  );

  IF p_session_id IS NULL OR length(btrim(p_session_id)) < 6 THEN
    RETURN jsonb_build_object('event_id', v_event_id, 'lead_id', NULL, 'customer_id', v_customer);
  END IF;

  v_label := CASE p_event_type
    WHEN 'call_click' THEN 'Tap to call'
    WHEN 'text_click' THEN 'Text message intent'
    WHEN 'email_click' THEN 'Email the office'
    ELSE 'Online booking started'
  END;

  v_note := to_char(now(), 'YYYY-MM-DD HH24:MI') || ' - ' || v_label
    || COALESCE(' (' || p_placement || ')', '')
    || COALESCE(' on ' || p_page_path, '');

  v_ref := md5('contact:' || p_session_id)::uuid;

  SELECT * INTO v_lead FROM public.ss_leads
   WHERE intake_channel = 'contact_click' AND intake_ref = v_ref;

  IF NOT FOUND THEN
    v_name := NULLIF(btrim(COALESCE(p_full_name, '')), '');
    IF v_name IS NULL THEN
      v_name := 'Website visitor - ' || v_label;
    END IF;

    INSERT INTO public.ss_leads (
      full_name, phone, email, stage, source, message,
      intake_channel, intake_ref, promo_code
    ) VALUES (
      left(v_name, 80),
      left(NULLIF(btrim(COALESCE(p_phone, '')), ''), 30),
      left(NULLIF(btrim(COALESCE(p_email, '')), ''), 200),
      'new_lead',
      left('website_' || p_event_type, 60),
      v_note,
      'contact_click',
      v_ref,
      left(p_campaign_id, 40)
    )
    RETURNING * INTO v_lead;
  ELSE
    UPDATE public.ss_leads
       SET message = left(COALESCE(message || E'\n', '') || v_note, 4000),
           phone = COALESCE(phone, left(NULLIF(btrim(COALESCE(p_phone, '')), ''), 30)),
           email = COALESCE(email, left(NULLIF(btrim(COALESCE(p_email, '')), ''), 200)),
           stage = CASE WHEN stage = 'new_lead' THEN 'contacted'::ss_stage ELSE stage END
     WHERE id = v_lead.id
    RETURNING * INTO v_lead;
  END IF;

  RETURN jsonb_build_object('event_id', v_event_id, 'lead_id', v_lead.id, 'stage', v_lead.stage, 'customer_id', v_customer);
END;
$function$
;
CREATE OR REPLACE FUNCTION public.ss_log_quote_view(_token text, _device text DEFAULT NULL::text, _referrer text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_id uuid;
BEGIN
  SELECT id INTO v_id FROM public.ss_quotes WHERE token = _token AND trashed_at IS NULL;
  IF v_id IS NULL THEN RETURN; END IF;

  INSERT INTO public.ss_quote_views (quote_id, device, referrer)
  VALUES (v_id, NULLIF(left(coalesce(_device,''), 40), ''), NULLIF(left(coalesce(_referrer,''), 200), ''));

  UPDATE public.ss_quotes
     SET viewed_at = COALESCE(viewed_at, now()),
         status = CASE WHEN status = 'sent' THEN 'viewed' ELSE status END
   WHERE id = v_id;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.ss_log_savings_event(p_event_type text, p_placement text DEFAULT NULL::text, p_page_path text DEFAULT NULL::text, p_referrer text DEFAULT NULL::text, p_session_id text DEFAULT NULL::text, p_campaign_id text DEFAULT NULL::text, p_utm jsonb DEFAULT '{}'::jsonb, p_landing_page text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_event_id uuid;
BEGIN
  IF p_event_type NOT IN ('savings_view','savings_cta_click') THEN
    RAISE EXCEPTION 'invalid event type';
  END IF;

  INSERT INTO public.contact_events (
    event_type, placement, page_path, referrer, session_id,
    campaign_id, utm_source, utm_medium, utm_campaign, utm_term, utm_content, landing_page
  ) VALUES (
    p_event_type,
    left(p_placement, 120),
    left(p_page_path, 300),
    left(p_referrer, 500),
    left(p_session_id, 100),
    left(p_campaign_id, 120),
    left(p_utm->>'utm_source', 120),
    left(p_utm->>'utm_medium', 120),
    left(p_utm->>'utm_campaign', 120),
    left(p_utm->>'utm_term', 120),
    left(p_utm->>'utm_content', 120),
    left(p_landing_page, 300)
  ) RETURNING id INTO v_event_id;

  RETURN jsonb_build_object('event_id', v_event_id);
END;
$function$
;
CREATE OR REPLACE FUNCTION public.ss_mark_invoice_reminded(_invoice_id uuid)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  UPDATE public.ss_invoices SET reminder_sent_at = now(), updated_at = now() WHERE id = _invoice_id;
$function$
;
CREATE OR REPLACE FUNCTION public.ss_my_inspection_requests()
 RETURNS TABLE(id uuid, reference_number text, full_name text, address text, status text, preferred_contact_time text, notes text, created_at timestamp with time zone, updated_at timestamp with time zone, converted_at timestamp with time zone, eta_at timestamp with time zone, eta_window text, customer_note text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select r.id, r.reference_number, r.full_name, r.address, r.status,
         r.preferred_contact_time, r.notes, r.created_at, r.updated_at, r.converted_at,
         r.eta_at, r.eta_window, r.customer_note
  from public.inspection_requests r
  where auth.uid() is not null
    and lower(r.email) = lower(coalesce((auth.jwt() ->> 'email'), ''))
  order by r.created_at desc
  limit 25
$function$
;
CREATE OR REPLACE FUNCTION public.ss_my_invoice_payments(_invoice_id uuid)
 RETURNS TABLE(paid_on timestamp with time zone, method text, kind text, amount numeric, pending boolean, note text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT p.created_at AS paid_on,
         coalesce(p.method, '') AS method,
         coalesce(p.kind, 'payment') AS kind,
         p.amount,
         (p.confirmed_at IS NULL) AS pending,
         p.note
  FROM public.ss_payments p
  JOIN public.ss_invoices inv ON inv.id = p.invoice_id
  WHERE p.invoice_id = _invoice_id
    AND inv.customer_id = public.ss_my_customer_id()
  UNION ALL
  SELECT c.created_at AS paid_on,
         'check' AS method,
         'check_dropoff' AS kind,
         c.amount,
         true AS pending,
         NULL::text AS note
  FROM public.ss_check_payments c
  JOIN public.ss_invoices inv ON inv.id = c.invoice_id
  WHERE c.invoice_id = _invoice_id
    AND inv.customer_id = public.ss_my_customer_id()
    AND c.status IN ('pending', 'received')
    -- Settled checks are already posted as a payment above; showing the
    -- drop-off too would list the same money twice.
    AND c.posted_payment_id IS NULL
  ORDER BY 1
$function$
;
CREATE OR REPLACE FUNCTION public.ss_my_visit_techs()
 RETURNS TABLE(visit_id uuid, tech_name text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT v.id, s.full_name
  FROM public.ss_visits v
  JOIN public.ss_staff s ON s.id = v.tech_id
  WHERE v.customer_id IN (SELECT public.ss_my_customer_ids())
$function$
;
CREATE OR REPLACE FUNCTION public.ss_new_referral_code()
 RETURNS text
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  candidate text;
  i int;
BEGIN
  LOOP
    candidate := 'POOL-';
    FOR i IN 1..6 LOOP
      candidate := candidate || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.ss_customers WHERE referral_code = candidate);
  END LOOP;
  RETURN candidate;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.ss_next_due_date(_anchor date, _from date DEFAULT CURRENT_DATE)
 RETURNS date
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN _anchor IS NULL THEN _from + 30
    WHEN _from <= _anchor THEN _anchor
    ELSE (_anchor + (30 * ceil((_from - _anchor)::numeric / 30.0))::int)::date
  END;
$function$
;
CREATE OR REPLACE FUNCTION public.ss_next_pool_number()
 RETURNS text
 LANGUAGE sql
 SET search_path TO 'public'
AS $function$
  SELECT 'SS-' || lpad(nextval('public.ss_pool_number_seq')::text, 5, '0')
$function$
;
CREATE OR REPLACE FUNCTION public.ss_norm_address(_addr text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  SELECT nullif(btrim(regexp_replace(lower(coalesce(_addr, '')), '[^a-z0-9]+', ' ', 'g')), '')
$function$
;
CREATE OR REPLACE FUNCTION public.ss_notify_office(_kind text, _title text, _body text, _link text)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  INSERT INTO public.ss_notifications (user_id, kind, title, body, link)
  SELECT DISTINCT s.user_id, _kind, left(_title, 200), left(coalesce(_body, ''), 1000), _link
    FROM public.ss_staff s
   WHERE s.user_id IS NOT NULL
     AND s.level IN ('owner','office_manager')
  UNION
  SELECT DISTINCT r.user_id, _kind, left(_title, 200), left(coalesce(_body, ''), 1000), _link
    FROM public.user_roles r
   WHERE r.role = 'admin';
$function$
;
CREATE OR REPLACE FUNCTION public.ss_open_invoice_for(_customer uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_inv uuid;
  v_price numeric;
  v_anchor date;
  v_month date := date_trunc('month', CURRENT_DATE)::date;
BEGIN
  IF _customer IS NULL THEN RETURN NULL; END IF;
  SELECT id INTO v_inv FROM public.ss_invoices
   WHERE customer_id = _customer AND status NOT IN ('void', 'paid')
   ORDER BY issued_on DESC NULLS LAST, created_at DESC LIMIT 1;
  IF v_inv IS NOT NULL THEN RETURN v_inv; END IF;
  SELECT coalesce(monthly_price, 0), billing_anchor_date INTO v_price, v_anchor
    FROM public.ss_customers WHERE id = _customer;
  INSERT INTO public.ss_invoices (customer_id, amount, kind, status, issued_on, due_date, period_month)
  VALUES (_customer, round(coalesce(v_price, 0), 2), 'recurring', 'not_paid', CURRENT_DATE,
          public.ss_next_due_date(v_anchor, CURRENT_DATE), v_month)
  RETURNING id INTO v_inv;
  IF coalesce(v_price, 0) > 0 THEN PERFORM public.ss_add_recurring_invoice_lines(v_inv, _customer, v_month); END IF;
  RETURN v_inv;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.ss_pick_lead_owner(p_city text)
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH techs AS (
    SELECT s.id,
           (SELECT count(*) FROM public.ss_customers c
              WHERE c.assigned_tech_id = s.id
                AND p_city IS NOT NULL
                AND lower(coalesce(c.city,'')) = lower(p_city)) AS city_match,
           (SELECT count(*) FROM public.ss_leads l
              WHERE l.assigned_staff_id = s.id
                AND l.stage NOT IN ('won','lost')) AS open_leads
    FROM public.ss_staff s
    WHERE s.is_active AND s.level = 'technician'
  )
  SELECT id FROM (
    SELECT id, city_match, open_leads FROM techs
    UNION ALL
    SELECT s.id, 0, 0 FROM public.ss_staff s
    WHERE s.is_active AND s.level IN ('office_manager','owner')
      AND NOT EXISTS (SELECT 1 FROM techs)
  ) ranked
  ORDER BY city_match DESC, open_leads ASC, id
  LIMIT 1;
$function$
;
CREATE OR REPLACE FUNCTION public.ss_promote_prospect(_customer_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF _customer_id IS NULL THEN RETURN; END IF;
  UPDATE public.ss_customers
     SET status = 'active'::public.ss_cust_status,
         became_customer_at = COALESCE(became_customer_at, now())
   WHERE id = _customer_id
     AND status = 'prospect'::public.ss_cust_status;
  UPDATE public.ss_customers
     SET became_customer_at = now()
   WHERE id = _customer_id AND became_customer_at IS NULL;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.ss_purge_webhook_deliveries(_days integer DEFAULT NULL::integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_days integer;
  v_cutoff timestamptz;
  v_deleted integer;
BEGIN
  IF _days IS NOT NULL AND NOT public.ss_is_owner() THEN
    RAISE EXCEPTION 'Only the owner can purge webhook deliveries';
  END IF;

  v_days := COALESCE(
    _days,
    NULLIF((SELECT value->>'retention_days' FROM public.ss_settings WHERE key = 'webhook_deliveries'), '')::integer,
    30
  );
  IF v_days < 1 THEN v_days := 1; END IF;
  IF v_days > 365 THEN v_days := 365; END IF;

  v_cutoff := now() - make_interval(days => v_days);

  DELETE FROM public.ss_webhook_deliveries WHERE created_at < v_cutoff;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  RETURN jsonb_build_object('deleted', v_deleted, 'retention_days', v_days, 'cutoff', v_cutoff);
END;
$function$
;
CREATE OR REPLACE FUNCTION public.ss_recalc_invoice_paid(p_invoice_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_paid numeric := 0;
  inv public.ss_invoices%ROWTYPE;
BEGIN
  IF p_invoice_id IS NULL THEN RETURN; END IF;
  SELECT * INTO inv FROM public.ss_invoices WHERE id = p_invoice_id;
  IF inv.id IS NULL THEN RETURN; END IF;

  SELECT coalesce(sum(CASE WHEN kind = 'refund' THEN -amount ELSE amount END), 0)
    INTO v_paid
    FROM public.ss_payments
   WHERE invoice_id = p_invoice_id;

  IF v_paid < 0 THEN v_paid := 0; END IF;

  UPDATE public.ss_invoices
     SET amount_paid = v_paid,
         status = CASE
                    WHEN inv.status = 'void' THEN 'void'
                    WHEN v_paid >= inv.amount AND inv.amount > 0 THEN 'paid'
                    WHEN v_paid > 0 THEN 'partial'
                    WHEN inv.status IN ('paid', 'partial') THEN 'not_paid'
                    ELSE inv.status
                  END,
         paid_at = CASE
                     WHEN v_paid >= inv.amount AND inv.amount > 0 THEN coalesce(inv.paid_at, now())
                     ELSE NULL
                   END,
         past_due_at = CASE WHEN v_paid >= inv.amount AND inv.amount > 0 THEN NULL ELSE inv.past_due_at END,
         hold_at = CASE WHEN v_paid >= inv.amount AND inv.amount > 0 THEN NULL ELSE inv.hold_at END,
         updated_at = now()
   WHERE id = p_invoice_id;

  -- No overdue balance left anywhere? Service resumes.
  IF NOT EXISTS (
    SELECT 1 FROM public.ss_invoices i
     WHERE i.customer_id = inv.customer_id
       AND i.status IN ('not_paid', 'partial', 'open')
       AND i.hold_at IS NOT NULL
  ) THEN
    UPDATE public.ss_customers
       SET service_hold_at = NULL, service_hold_reason = NULL
     WHERE id = inv.customer_id AND service_hold_at IS NOT NULL;
  END IF;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.ss_redeem_access_code(_code text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_norm text := upper(regexp_replace(COALESCE(_code, ''), '[^A-Za-z0-9]', '', 'g'));
  v_row public.ss_access_codes;
  v_customer uuid;
  v_owner uuid;
  v_user_tries int;
  v_code_tries int;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Sign in first');
  END IF;
  IF v_norm = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Enter your access code');
  END IF;

  SELECT count(*) INTO v_user_tries FROM public.ss_access_attempts
   WHERE user_id = v_uid AND success = false AND created_at > now() - interval '1 hour';
  IF v_user_tries >= 8 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Too many attempts. Try again in an hour.');
  END IF;

  SELECT count(*) INTO v_code_tries FROM public.ss_access_attempts
   WHERE code_norm = v_norm AND success = false AND created_at > now() - interval '1 hour';
  IF v_code_tries >= 20 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Too many attempts on this code. Try again later.');
  END IF;

  SELECT * INTO v_row FROM public.ss_access_codes
   WHERE upper(regexp_replace(code, '[^A-Za-z0-9]', '', 'g')) = v_norm
   FOR UPDATE;

  IF v_row.id IS NULL THEN
    INSERT INTO public.ss_access_attempts (user_id, code_norm, success, reason) VALUES (v_uid, v_norm, false, 'not_found');
    RETURN jsonb_build_object('ok', false, 'error', 'That code was not found');
  END IF;

  IF v_row.status = 'redeemed' AND v_row.redeemed_by = v_uid THEN
    INSERT INTO public.ss_access_attempts (user_id, code_norm, success, reason) VALUES (v_uid, v_norm, true, 'already_redeemed_by_self');
    RETURN jsonb_build_object('ok', true, 'customer_id', v_row.customer_id, 'staff_id', v_row.staff_id, 'already', true);
  END IF;

  IF v_row.status <> 'active' THEN
    INSERT INTO public.ss_access_attempts (user_id, code_norm, success, reason) VALUES (v_uid, v_norm, false, 'used');
    RETURN jsonb_build_object('ok', false, 'error', 'That code has already been used');
  END IF;
  IF v_row.expires_at IS NOT NULL AND v_row.expires_at < now() THEN
    INSERT INTO public.ss_access_attempts (user_id, code_norm, success, reason) VALUES (v_uid, v_norm, false, 'expired');
    RETURN jsonb_build_object('ok', false, 'error', 'That code has expired');
  END IF;

  -- The invite names a pool that already belongs to somebody else: refuse before consuming it.
  IF v_row.customer_id IS NOT NULL THEN
    SELECT user_id INTO v_owner FROM public.ss_customers WHERE id = v_row.customer_id;
    IF v_owner IS NOT NULL AND v_owner <> v_uid THEN
      INSERT INTO public.ss_access_attempts (user_id, code_norm, success, reason) VALUES (v_uid, v_norm, false, 'other_owner');
      RETURN jsonb_build_object('ok', false, 'error', 'That code belongs to another account. Call the office and we will re-issue it.');
    END IF;
  END IF;

  UPDATE public.ss_access_codes
     SET status = 'redeemed', redeemed_by = v_uid, redeemed_at = now()
   WHERE id = v_row.id AND status = 'active';
  IF NOT FOUND THEN
    INSERT INTO public.ss_access_attempts (user_id, code_norm, success, reason) VALUES (v_uid, v_norm, false, 'race');
    RETURN jsonb_build_object('ok', false, 'error', 'That code has already been used');
  END IF;

  -- Crew invite: attach this login to the roster record, no homeowner account.
  IF v_row.staff_id IS NOT NULL THEN
    UPDATE public.ss_staff
       SET user_id = COALESCE(user_id, v_uid),
           is_active = true
     WHERE id = v_row.staff_id;

    INSERT INTO public.ss_access_attempts (user_id, code_norm, success, reason) VALUES (v_uid, v_norm, true, 'redeemed_staff');
    RETURN jsonb_build_object('ok', true, 'staff_id', v_row.staff_id, 'kind', 'staff');
  END IF;

  IF v_row.customer_id IS NOT NULL THEN
    -- Always attach the pool the invite names, even when this login already has
    -- other properties on file. One login, many pools.
    v_customer := v_row.customer_id;
    UPDATE public.ss_customers
       SET user_id = COALESCE(user_id, v_uid),
           address = COALESCE(NULLIF(v_row.address, ''), address),
           city = COALESCE(NULLIF(v_row.city, ''), city),
           state = COALESCE(NULLIF(v_row.state, ''), state),
           postal_code = COALESCE(NULLIF(v_row.postal_code, ''), postal_code)
     WHERE id = v_customer;
  ELSE
    SELECT id INTO v_customer FROM public.ss_customers WHERE user_id = v_uid LIMIT 1;

    IF v_customer IS NULL THEN
      INSERT INTO public.ss_customers (user_id, full_name, email, phone, address, city, state, postal_code, status)
      VALUES (
        v_uid,
        COALESCE(NULLIF(v_row.full_name, ''), (SELECT email FROM auth.users WHERE id = v_uid)),
        COALESCE(v_row.email, (SELECT email FROM auth.users WHERE id = v_uid)),
        v_row.phone, v_row.address, v_row.city, v_row.state, v_row.postal_code, 'active'
      )
      RETURNING id INTO v_customer;
    ELSE
      UPDATE public.ss_customers
         SET address = COALESCE(NULLIF(v_row.address, ''), address),
             city = COALESCE(NULLIF(v_row.city, ''), city),
             state = COALESCE(NULLIF(v_row.state, ''), state),
             postal_code = COALESCE(NULLIF(v_row.postal_code, ''), postal_code)
       WHERE id = v_customer;
    END IF;
  END IF;

  IF COALESCE(v_row.address, '') <> '' AND NOT EXISTS (
    SELECT 1 FROM public.ss_service_addresses
     WHERE customer_id = v_customer AND lower(address) = lower(v_row.address)
  ) THEN
    INSERT INTO public.ss_service_addresses (customer_id, label, address, city, state, postal_code, is_default)
    VALUES (v_customer, 'Home', v_row.address, v_row.city, v_row.state, v_row.postal_code, true);
  END IF;

  UPDATE public.ss_access_codes SET customer_id = v_customer WHERE id = v_row.id;

  INSERT INTO public.ss_access_attempts (user_id, code_norm, success, reason) VALUES (v_uid, v_norm, true, 'redeemed');

  RETURN jsonb_build_object('ok', true, 'customer_id', v_customer, 'kind', 'customer');
END;
$function$
;
CREATE OR REPLACE FUNCTION public.ss_remit_info()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT jsonb_build_object(
    'payee_name', b.payee_name,
    'mail_line1', b.mail_line1,
    'mail_line2', b.mail_line2,
    'mail_city', b.mail_city,
    'mail_state', b.mail_state,
    'mail_postal', b.mail_postal,
    'memo_instructions', b.memo_instructions
  )
  FROM public.ss_bank_details b
  ORDER BY b.created_at
  LIMIT 1
$function$
;
CREATE OR REPLACE FUNCTION public.ss_request_cancellation(p_token text, p_reason text, p_note text DEFAULT NULL::text, p_preferred_date date DEFAULT NULL::date, p_ip text DEFAULT NULL::text, p_user_agent text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_contract record;
  v_existing record;
  v_effective date;
  v_ref text;
  v_id uuid;
  v_priority text;
BEGIN
  IF p_reason NOT IN ('moving','selling','diy','price','service_issue','other') THEN
    RAISE EXCEPTION 'invalid reason';
  END IF;

  SELECT c.id, c.customer_id, c.title, c.signed_at, c.voided_at, c.recipient_name
    INTO v_contract
  FROM public.ss_contracts c WHERE c.token = p_token LIMIT 1;

  IF v_contract.id IS NULL THEN
    RAISE EXCEPTION 'agreement not found';
  END IF;
  IF v_contract.voided_at IS NOT NULL THEN
    RAISE EXCEPTION 'this agreement is no longer active';
  END IF;

  SELECT r.id, r.reference, r.effective_date, r.status INTO v_existing
  FROM public.ss_cancellation_requests r
  WHERE r.contract_id = v_contract.id AND r.status = 'pending'
  LIMIT 1;

  IF v_existing.id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'reference', v_existing.reference,
      'effective_date', v_existing.effective_date,
      'status', v_existing.status,
      'duplicate', true
    );
  END IF;

  v_effective := greatest(current_date + 30, coalesce(p_preferred_date, current_date + 30));
  v_ref := 'CX-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));

  INSERT INTO public.ss_cancellation_requests (
    contract_id, customer_id, reference, reason, note, effective_date, ip, user_agent
  ) VALUES (
    v_contract.id, v_contract.customer_id, v_ref, p_reason,
    left(nullif(btrim(coalesce(p_note, '')), ''), 1000),
    v_effective, left(p_ip, 60), left(p_user_agent, 300)
  ) RETURNING id INTO v_id;

  INSERT INTO public.ss_contract_events (contract_id, event, detail, ip, user_agent)
  VALUES (v_contract.id, 'cancel_requested',
          format('%s, effective %s (%s)', v_ref, v_effective, p_reason),
          left(p_ip, 60), left(p_user_agent, 300));

  v_priority := CASE WHEN p_reason = 'service_issue' THEN 'high' ELSE 'normal' END;

  INSERT INTO public.ss_internal_tasks (customer_id, title, details, due_at, priority, created_by_name)
  VALUES (
    v_contract.customer_id,
    format('Cancellation requested, %s', coalesce(v_contract.recipient_name, 'customer')),
    format('Ref %s. Reason: %s. Effective %s.%s', v_ref, p_reason, v_effective,
           CASE WHEN coalesce(btrim(p_note), '') = '' THEN '' ELSE ' Note: ' || left(btrim(p_note), 500) END),
    (v_effective - 7)::timestamptz,
    v_priority,
    'Cancellation link'
  );

  IF v_contract.customer_id IS NOT NULL THEN
    INSERT INTO public.ss_alerts (customer_id, priority, title, body)
    VALUES (
      v_contract.customer_id,
      CASE WHEN p_reason = 'service_issue' THEN 'HIGH' ELSE 'MED' END,
      'Cancellation requested',
      format('Ref %s, service stops %s. Reason: %s.', v_ref, v_effective, p_reason)
    );
  END IF;

  RETURN jsonb_build_object(
    'reference', v_ref,
    'effective_date', v_effective,
    'status', 'pending',
    'duplicate', false
  );
END;
$function$
;
CREATE OR REPLACE FUNCTION public.ss_run_invoice_dunning()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_past int := 0;
  v_remind jsonb := '[]'::jsonb;
  v_held int := 0;
  r record;
BEGIN
  -- Day 0: anything unpaid past its due date is past due.
  UPDATE public.ss_invoices
     SET past_due_at = now(), updated_at = now()
   WHERE status IN ('not_paid', 'partial', 'open')
     AND due_date IS NOT NULL
     AND due_date < CURRENT_DATE
     AND past_due_at IS NULL;
  GET DIAGNOSTICS v_past = ROW_COUNT;

  -- Day 7: reminder worklist (the app sends the email and text).
  FOR r IN
    SELECT i.id, i.invoice_number, i.amount - i.amount_paid AS balance, i.due_date,
           cu.id AS customer_id, cu.full_name, cu.email, cu.phone
      FROM public.ss_invoices i
      JOIN public.ss_customers cu ON cu.id = i.customer_id
     WHERE i.status IN ('not_paid', 'partial', 'open')
       AND i.due_date IS NOT NULL
       AND i.due_date <= CURRENT_DATE - 7
       AND i.reminder_sent_at IS NULL
  LOOP
    v_remind := v_remind || jsonb_build_object(
      'invoice_id', r.id, 'invoice_number', r.invoice_number, 'balance', r.balance,
      'due_date', r.due_date, 'customer_id', r.customer_id, 'full_name', r.full_name,
      'email', r.email, 'phone', r.phone
    );
  END LOOP;

  -- Day 15: hold service until the balance is cleared.
  FOR r IN
    SELECT i.id, i.invoice_number, i.customer_id, cu.full_name
      FROM public.ss_invoices i
      JOIN public.ss_customers cu ON cu.id = i.customer_id
     WHERE i.status IN ('not_paid', 'partial', 'open')
       AND i.due_date IS NOT NULL
       AND i.due_date <= CURRENT_DATE - 15
       AND i.hold_at IS NULL
  LOOP
    UPDATE public.ss_invoices SET hold_at = now(), updated_at = now() WHERE id = r.id;
    UPDATE public.ss_customers
       SET service_hold_at = coalesce(service_hold_at, now()),
           service_hold_reason = 'Balance due on invoice ' || r.invoice_number
     WHERE id = r.customer_id;
    PERFORM public.ss_notify_office(
      'billing_hold',
      'Service hold, ' || r.full_name,
      'Invoice ' || r.invoice_number || ' is 15+ days past due. Upcoming visits are flagged do-not-service.',
      '/admin/crm/customers/' || r.customer_id
    );
    v_held := v_held + 1;
  END LOOP;

  RETURN jsonb_build_object('marked_past_due', v_past, 'reminders', v_remind, 'holds', v_held);
END;
$function$
;
CREATE OR REPLACE FUNCTION public.ss_run_lead_sla()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  cfg jsonb := public.ss_lead_sla_config();
  followup_hours int := COALESCE((cfg->>'followup_hours')::int, 24);
  max_reminders int := COALESCE((cfg->>'max_reminders')::int, 5);
  l public.ss_leads%ROWTYPE;
  owner_user uuid;
  sent int := 0;
  marked int := 0;
BEGIN
  FOR l IN
    SELECT * FROM public.ss_leads
    WHERE stage NOT IN ('won','lost')
      AND converted_customer_id IS NULL
      AND sla_due_at IS NOT NULL
  LOOP
    IF public.ss_lead_is_resolved(l) THEN
      IF l.sla_status <> 'met' THEN
        UPDATE public.ss_leads SET sla_status = 'met' WHERE id = l.id;
        marked := marked + 1;
      END IF;
      CONTINUE;
    END IF;

    IF now() < l.sla_due_at THEN
      IF l.sla_status <> 'on_track' THEN
        UPDATE public.ss_leads SET sla_status = 'on_track' WHERE id = l.id;
      END IF;
      CONTINUE;
    END IF;

    IF l.reminder_count >= max_reminders THEN
      UPDATE public.ss_leads SET sla_status = 'overdue' WHERE id = l.id;
      CONTINUE;
    END IF;
    IF l.last_reminder_at IS NOT NULL
       AND now() < l.last_reminder_at + make_interval(hours => followup_hours) THEN
      CONTINUE;
    END IF;

    SELECT s.user_id INTO owner_user
    FROM public.ss_staff s WHERE s.id = l.assigned_staff_id AND s.is_active;

    IF owner_user IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.ss_notification_prefs p
      WHERE p.user_id = owner_user AND p.lead_sla_in_app = false
    ) IS NOT TRUE THEN
      INSERT INTO public.ss_notifications (user_id, kind, title, body, link)
      VALUES (
        owner_user, 'lead_sla',
        'Follow up with ' || l.full_name,
        'No inspection booked yet, this lead has been waiting since '
          || to_char(l.created_at, 'Mon FMDD') || '. Reminder #' || (l.reminder_count + 1) || '.',
        '/admin/crm/pipeline'
      );
    END IF;

    INSERT INTO public.ss_alerts (customer_id, tech_id, priority, title, body)
    VALUES (
      NULL, l.assigned_staff_id,
      CASE WHEN l.reminder_count >= 2 THEN 'high' ELSE 'normal' END,
      'Lead follow-up overdue, ' || l.full_name,
      COALESCE(l.city, '') || ' · no inspection scheduled · reminder #' || (l.reminder_count + 1)
    );

    -- ss_lead_events uses event_type + label (the old "event" column is gone).
    INSERT INTO public.ss_lead_events (lead_id, event_type, label, detail)
    VALUES (
      l.id,
      'sla_reminder',
      'Follow-up reminder #' || (l.reminder_count + 1),
      'Follow-up reminder #' || (l.reminder_count + 1) || ' sent, no inspection scheduled'
    );

    UPDATE public.ss_leads
       SET last_reminder_at = now(),
           reminder_count = l.reminder_count + 1,
           sla_status = 'overdue'
     WHERE id = l.id;

    sent := sent + 1;
  END LOOP;

  RETURN jsonb_build_object('reminders_sent', sent, 'leads_met', marked, 'ran_at', now());
END;
$function$
;
CREATE OR REPLACE FUNCTION public.ss_run_task_sla()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  global_cfg jsonb := public.ss_task_sla_config();
  cfg jsonb;
  warn_h numeric;
  esc_h numeric;
  reass_h numeric;
  fallback uuid;
  notify_office boolean;
  channels jsonb;
  t public.ss_internal_tasks%ROWTYPE;
  target_level int;
  vars jsonb;
  client_line text;
  assignee_name text;
  warned int := 0;
  escalated int := 0;
  reassigned int := 0;
  overridden int := 0;
  office_user uuid;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.ss_is_office() THEN
    RAISE EXCEPTION 'Only office staff can run task escalation';
  END IF;

  IF COALESCE((global_cfg->>'enabled')::boolean, true) IS NOT TRUE THEN
    RETURN jsonb_build_object('enabled', false, 'ran_at', now());
  END IF;

  FOR t IN
    SELECT * FROM public.ss_internal_tasks
    WHERE status = 'open' AND due_at IS NOT NULL AND due_at < now()
    ORDER BY due_at
    LIMIT 500
  LOOP
    cfg := public.ss_sla_effective_config(t.lead_id, t.customer_id);
    IF COALESCE((cfg->>'enabled')::boolean, true) IS NOT TRUE THEN
      CONTINUE;
    END IF;
    IF COALESCE((cfg->>'override')::boolean, false) THEN
      overridden := overridden + 1;
    END IF;

    warn_h := COALESCE((cfg->>'warn_hours')::numeric, 0);
    esc_h := COALESCE((cfg->>'escalate_hours')::numeric, 4);
    reass_h := COALESCE((cfg->>'reassign_hours')::numeric, 24);
    fallback := NULLIF(cfg->>'fallback_user_id', '')::uuid;
    notify_office := COALESCE((cfg->>'notify_office')::boolean, true);
    channels := COALESCE(cfg->'channels', '{"in_app": true, "email": false, "sms": false}'::jsonb);

    target_level := 0;
    IF now() >= t.due_at + make_interval(mins => (warn_h * 60)::int) THEN target_level := 1; END IF;
    IF now() >= t.due_at + make_interval(mins => (esc_h * 60)::int) THEN target_level := 2; END IF;
    IF fallback IS NOT NULL AND now() >= t.due_at + make_interval(mins => (reass_h * 60)::int) THEN
      target_level := 3;
    END IF;

    IF target_level <= t.escalation_level THEN
      CONTINUE;
    END IF;

    SELECT full_name INTO assignee_name FROM public.ss_staff WHERE user_id = t.assigned_to LIMIT 1;

    client_line := '';
    IF t.customer_id IS NOT NULL THEN
      SELECT 'Customer: ' || COALESCE(full_name, 'customer') || '.' INTO client_line
        FROM public.ss_customers WHERE id = t.customer_id;
    ELSIF t.lead_id IS NOT NULL THEN
      SELECT 'Lead: ' || COALESCE(full_name, 'lead') || '.' INTO client_line
        FROM public.ss_leads WHERE id = t.lead_id;
    END IF;

    vars := jsonb_build_object(
      'task', COALESCE(NULLIF(t.title, ''), 'Task'),
      'due', to_char(t.due_at, 'Mon FMDD HH12:MIam'),
      'assignee', COALESCE(assignee_name, 'team'),
      'client', COALESCE(client_line, ''),
      'priority', t.priority,
      'plan', COALESCE(cfg->>'override_label', 'Standard SLA')
    );

    IF target_level = 1 THEN
      PERFORM public.ss_sla_notify('warn', t.assigned_to, t.id, channels, vars);
      warned := warned + 1;

    ELSIF target_level = 2 THEN
      UPDATE public.ss_internal_tasks SET priority = 'high' WHERE id = t.id;
      PERFORM public.ss_sla_notify('escalate', t.assigned_to, t.id, channels, vars);
      IF notify_office THEN
        FOR office_user IN
          SELECT s.user_id FROM public.ss_staff s
          WHERE s.is_active AND s.user_id IS NOT NULL AND s.level IN ('owner','office_manager')
        LOOP
          PERFORM public.ss_sla_notify('office_escalate', office_user, t.id, channels, vars);
        END LOOP;
      END IF;
      escalated := escalated + 1;

    ELSE
      UPDATE public.ss_internal_tasks
         SET assigned_to = fallback,
             priority = 'high',
             escalated_from = COALESCE(t.escalated_from, t.assigned_to)
       WHERE id = t.id;
      PERFORM public.ss_sla_notify('reassign_new', fallback, t.id, channels, vars);
      IF t.assigned_to IS NOT NULL AND t.assigned_to <> fallback THEN
        PERFORM public.ss_sla_notify('reassign_prev', t.assigned_to, t.id, channels, vars);
      END IF;
      reassigned := reassigned + 1;
    END IF;

    UPDATE public.ss_internal_tasks
       SET escalation_level = target_level, last_escalated_at = now()
     WHERE id = t.id;
  END LOOP;

  RETURN jsonb_build_object('warned', warned, 'escalated', escalated,
                            'reassigned', reassigned, 'overrides_applied', overridden,
                            'ran_at', now());
END;
$function$
;
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
CREATE OR REPLACE FUNCTION public.ss_tg_booking_to_lead()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_city text;
BEGIN
  SELECT c.city INTO v_city
    FROM public.ss_city_rates c
   WHERE c.is_active AND NEW.address ILIKE '%' || c.city || '%'
   ORDER BY length(c.city) DESC
   LIMIT 1;

  INSERT INTO public.ss_leads (full_name, email, phone, address, city, message, source, intake_channel, intake_ref)
  VALUES (NEW.name, NEW.email, NEW.phone, nullif(NEW.address,'Not provided'), v_city,
          coalesce(NEW.service,'') || coalesce(', ' || NEW.notes, ''),
          'website', 'booking_form', NEW.id)
  ON CONFLICT (intake_channel, intake_ref) DO NOTHING;

  RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.ss_tg_chat_touch()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.ss_chat_channels
     SET last_message_at = NEW.created_at,
         last_preview = left(NEW.body, 140)
   WHERE id = NEW.channel_id;
  RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.ss_tg_contract_first_payment_amount()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v numeric;
BEGIN
  IF NEW.first_payment_amount IS NOT NULL AND NEW.first_payment_amount > 0 THEN
    RETURN NEW;
  END IF;

  v := NULLIF(regexp_replace(COALESCE(NEW.merge_data->>'total',''), '[^0-9.]', '', 'g'), '')::numeric;
  IF v IS NULL OR v <= 0 THEN
    v := NULLIF(regexp_replace(COALESCE(NEW.merge_data->>'monthly_price',''), '[^0-9.]', '', 'g'), '')::numeric;
  END IF;
  IF v IS NULL OR v <= 0 THEN
    v := NULLIF(regexp_replace(COALESCE(NEW.merge_data->'summary'->>'monthly_price',''), '[^0-9.]', '', 'g'), '')::numeric;
  END IF;

  IF v IS NOT NULL AND v > 0 THEN
    NEW.first_payment_amount := v;
  END IF;
  RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.ss_tg_contract_signed_invite()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_code text;
  v_cust public.ss_customers;
BEGIN
  IF NEW.status <> 'signed' OR COALESCE(OLD.status, '') = 'signed' THEN
    RETURN NEW;
  END IF;

  -- Already has a live invite, or the signer already has a portal login: nothing to do.
  IF EXISTS (SELECT 1 FROM public.ss_access_codes WHERE contract_id = NEW.id AND status = 'active') THEN
    RETURN NEW;
  END IF;
  IF NEW.customer_id IS NOT NULL THEN
    SELECT * INTO v_cust FROM public.ss_customers WHERE id = NEW.customer_id;
    IF v_cust.user_id IS NOT NULL THEN
      RETURN NEW;
    END IF;
  END IF;

  v_code := 'SAVVY-' || upper(substr(md5(gen_random_uuid()::text), 1, 4)) || '-' || upper(substr(md5(gen_random_uuid()::text), 5, 4));

  INSERT INTO public.ss_access_codes
    (code, customer_id, contract_id, source, full_name, email, phone, address, city, state, postal_code, note, status, expires_at)
  VALUES (
    v_code,
    NEW.customer_id,
    NEW.id,
    'contract_signed',
    COALESCE(NEW.signer_name, NEW.recipient_name, v_cust.full_name),
    COALESCE(NEW.recipient_email, v_cust.email),
    COALESCE(NEW.recipient_phone, v_cust.phone),
    v_cust.address, v_cust.city, v_cust.state, v_cust.postal_code,
    'Auto-issued when "' || NEW.title || '" was signed',
    'active',
    now() + interval '14 days'
  );

  RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.ss_tg_contract_signed_promote()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.signed_at IS NOT NULL AND (OLD.signed_at IS NULL) THEN
    PERFORM public.ss_promote_prospect(NEW.customer_id);
  END IF;
  RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.ss_tg_disable_tag_on_archive()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = 'inactive' AND COALESCE(OLD.status::text, '') <> 'inactive' THEN
    UPDATE public.ss_qr_tags
       SET status = 'disabled',
           disabled_at = now(),
           disabled_reason = COALESCE(disabled_reason, 'customer_archived')
     WHERE customer_id = NEW.id
       AND status <> 'disabled';
  END IF;
  RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.ss_tg_inspection_to_lead()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_city text;
BEGIN
  SELECT c.city INTO v_city
    FROM public.ss_city_rates c
   WHERE c.is_active AND NEW.address ILIKE '%' || c.city || '%'
   ORDER BY length(c.city) DESC
   LIMIT 1;

  INSERT INTO public.ss_leads (full_name, email, phone, address, city, message, source, intake_channel, intake_ref)
  VALUES (NEW.full_name, NEW.email, NEW.phone, NEW.address, v_city,
          'Free inspection ' || NEW.reference_number ||
            coalesce(', ' || NEW.pool_details, '') || coalesce(', ' || NEW.notes, ''),
          coalesce(nullif(NEW.utm_source,''), 'website'), 'inspection_request', NEW.id)
  ON CONFLICT (intake_channel, intake_ref) DO NOTHING;

  RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.ss_tg_lead_alert()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM net.http_post(
    url := 'https://savvyswim.app/api/public/hooks/lead-alert',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := jsonb_build_object('lead_id', NEW.id)
  );
  RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.ss_tg_lead_intake()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.stage IS NULL THEN
    NEW.stage := 'new_lead';
  END IF;
  IF NEW.assigned_staff_id IS NULL THEN
    NEW.assigned_staff_id := public.ss_pick_lead_owner(NEW.city);
  END IF;
  IF NEW.assigned_staff_id IS NOT NULL AND NEW.assigned_at IS NULL THEN
    NEW.assigned_at := now();
  END IF;
  RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.ss_tg_lead_sla_due()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  cfg jsonb := public.ss_lead_sla_config();
BEGIN
  IF NEW.sla_due_at IS NULL THEN
    NEW.sla_due_at := COALESCE(NEW.created_at, now())
      + make_interval(hours => COALESCE((cfg->>'first_response_hours')::int, 2));
  END IF;
  RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.ss_tg_payment_recalc_invoice()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP <> 'INSERT' AND OLD.invoice_id IS NOT NULL THEN
    PERFORM public.ss_recalc_invoice_paid(OLD.invoice_id);
  END IF;
  IF TG_OP <> 'DELETE' AND NEW.invoice_id IS NOT NULL THEN
    PERFORM public.ss_recalc_invoice_paid(NEW.invoice_id);
  END IF;
  RETURN NULL;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.ss_tg_quote_accepted_promote()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.accepted_at IS NOT NULL AND (OLD.accepted_at IS NULL) THEN
    PERFORM public.ss_promote_prospect(NEW.customer_id);
  END IF;
  RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.ss_tg_set_billing_anchor()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.customer_id IS NOT NULL AND NEW.scheduled_date IS NOT NULL THEN
    UPDATE public.ss_customers
       SET billing_anchor_date = NEW.scheduled_date
     WHERE id = NEW.customer_id
       AND (billing_anchor_date IS NULL OR NEW.scheduled_date < billing_anchor_date);
  END IF;
  RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.ss_tg_visit_care_cycle()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  did_filter boolean := false;
  did_salt boolean := false;
  done_on date := coalesce(new.completed_at::date, new.scheduled_date, current_date);
begin
  if new.status is distinct from 'completed' then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.status = 'completed' then
    return new;
  end if;

  did_filter := coalesce((new.checklist->>'filter_clean')::boolean, (new.checklist->>'filter_cleaning')::boolean, false)
                or coalesce(new.cartridge_cleaned, false);
  did_salt := coalesce((new.checklist->>'salt_cell_clean')::boolean, (new.checklist->>'salt_cell_cleaning')::boolean, false);

  if did_filter then
    update public.ss_customers
       set last_filter_clean_at = done_on,
           filter_interval_days = coalesce(nullif(filter_interval_days, 0), 120)
     where id = new.customer_id;
  end if;

  if did_salt then
    update public.ss_customers
       set last_salt_cell_clean_at = done_on,
           salt_cell_interval_days = coalesce(nullif(salt_cell_interval_days, 0), 120)
     where id = new.customer_id;
  end if;

  if coalesce(new.cartridge_cleaned, false) then
    update public.ss_customers set last_cartridge_clean_at = done_on where id = new.customer_id;
  end if;

  if coalesce(new.backwash_done, false) then
    update public.ss_customers set last_backwash_at = done_on where id = new.customer_id;
  end if;

  if new.filter_type is not null and new.filter_type <> '' then
    update public.ss_customers
       set filter_type = new.filter_type,
           filter_identified_at = coalesce(filter_identified_at, now()),
           filter_label_photo_url = coalesce(new.filter_label_photo_url, filter_label_photo_url)
     where id = new.customer_id
       and (filter_type is null or filter_type = '' or filter_type = 'unknown' or new.filter_label_photo_url is not null);
  end if;

  if new.filter_psi_after is not null then
    update public.ss_customers
       set filter_baseline_psi = new.filter_psi_after
     where id = new.customer_id
       and (filter_baseline_psi is null or new.filter_psi_after < filter_baseline_psi);
  end if;

  return new;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.ss_tg_visit_cost_total()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_pay   numeric;
  v_chem  numeric;
  v_rate  numeric := 28;   -- fallback hourly labor cost
  v_chemv numeric := 2.77; -- fallback per-visit chemical cost ($12/month ÷ 4.33)
  v_has_chems boolean;
BEGIN
  -- Fill the office cost sheet from the technician's work log, but only when
  -- the office has not typed its own number in already.
  IF NEW.status = 'completed' THEN
    SELECT pc.tech_pay_per_visit, pc.chem_cost_per_visit
      INTO v_pay, v_chem
      FROM public.ss_pool_costs pc
     WHERE pc.customer_id = NEW.customer_id;

    IF COALESCE(NEW.labor_cost, 0) = 0 THEN
      IF v_pay IS NOT NULL AND v_pay > 0 THEN
        NEW.labor_cost := round(v_pay, 2);
      ELSIF COALESCE(NEW.labor_hours, 0) > 0 THEN
        NEW.labor_cost := round(NEW.labor_hours * v_rate, 2);
      END IF;
    END IF;

    v_has_chems := jsonb_typeof(COALESCE(NEW.dosing -> 'applied', 'null'::jsonb)) = 'array'
                   AND jsonb_array_length(NEW.dosing -> 'applied') > 0;

    IF COALESCE(NEW.chem_cost, 0) = 0 AND v_has_chems THEN
      NEW.chem_cost := round(COALESCE(NULLIF(v_chem, 0), v_chemv), 2);
    END IF;
  END IF;

  NEW.cost_total :=
    COALESCE(NEW.chem_cost, 0) + COALESCE(NEW.labor_cost, 0) + COALESCE(NEW.parts_cost, 0);
  RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.ss_tg_visit_defaults()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  c record;
  per_visit numeric;
BEGIN
  SELECT route_day, monthly_price, tech_pay_rate
    INTO c
    FROM public.ss_customers
   WHERE id = NEW.customer_id;

  -- Service day is the day the visit actually happens, not the customer's usual route day.
  IF NEW.service_day IS NULL OR btrim(NEW.service_day) = '' THEN
    NEW.service_day := to_char(NEW.scheduled_date, 'FMDay');
  END IF;

  per_visit := round(COALESCE(c.monthly_price, 0) / 4.33, 2);

  IF COALESCE(NEW.service_amount, 0) = 0 AND per_visit > 0 THEN
    NEW.service_amount := per_visit;
  END IF;

  IF COALESCE(NEW.tech_pay, 0) = 0 AND COALESCE(c.tech_pay_rate, 0) > 0 THEN
    NEW.tech_pay := round(c.tech_pay_rate, 2);
  END IF;

  RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.ss_tg_visit_invoice_line()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_inv   uuid;
  v_cost  numeric;
  v_label text;
BEGIN
  IF NEW.customer_id IS NULL THEN RETURN NULL; END IF;

  v_inv := public.ss_open_invoice_for(NEW.customer_id);
  IF v_inv IS NULL THEN RETURN NULL; END IF;

  v_cost := round(coalesce(NEW.cost_total, 0)::numeric, 2);
  v_label := 'Visit ' ||
    to_char(coalesce(NEW.completed_at::date, NEW.scheduled_date, CURRENT_DATE), 'Mon DD, YYYY')
    || ', visit cost (office only)';

  INSERT INTO public.ss_invoice_items
    (invoice_id, visit_id, description, quantity, unit_price, line_total, unit_cost, internal_only)
  VALUES (v_inv, NEW.id, v_label, 1, 0, 0, v_cost, true)
  ON CONFLICT (invoice_id, visit_id, internal_only) WHERE visit_id IS NOT NULL
  DO UPDATE SET unit_cost = EXCLUDED.unit_cost, description = EXCLUDED.description;

  RETURN NULL;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.ss_tg_visit_payment_pickup()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_method text;
begin
  select q.payment_method into v_method
  from public.ss_quotes q
  where q.customer_id = new.customer_id
    and q.payment_method in ('check','cash')
  order by q.created_at desc
  limit 1;

  if v_method is not null then
    insert into public.ss_payment_pickups (visit_id, customer_id, method)
    values (new.id, new.customer_id, v_method)
    on conflict (visit_id) do nothing;
  end if;
  return new;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.ss_touch_customer_attribution(p_email text, p_phone text, p_event_type text, p_placement text, p_campaign_id text, p_landing_page text, p_page_path text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_customer uuid;
  v_digits text := regexp_replace(COALESCE(p_phone, ''), '\D', '', 'g');
  v_label text := COALESCE(NULLIF(btrim(p_placement), ''), p_event_type);
BEGIN
  IF COALESCE(btrim(p_email), '') <> '' THEN
    SELECT id INTO v_customer FROM public.ss_customers
     WHERE lower(email) = lower(btrim(p_email)) LIMIT 1;
  END IF;

  IF v_customer IS NULL AND length(v_digits) >= 10 THEN
    SELECT id INTO v_customer FROM public.ss_customers
     WHERE right(regexp_replace(COALESCE(phone, ''), '\D', '', 'g'), 10) = right(v_digits, 10)
     LIMIT 1;
  END IF;

  IF v_customer IS NULL THEN
    RETURN NULL;
  END IF;

  UPDATE public.ss_customers
     SET first_touch_placement = COALESCE(first_touch_placement, v_label),
         first_touch_at = COALESCE(first_touch_at, now()),
         last_touch_placement = v_label,
         last_touch_at = now(),
         attribution_campaign = COALESCE(NULLIF(btrim(p_campaign_id), ''), attribution_campaign),
         attribution_landing_page = COALESCE(NULLIF(btrim(p_landing_page), ''), attribution_landing_page),
         attribution = jsonb_set(
           COALESCE(attribution, '{}'::jsonb),
           '{history}',
           (
             COALESCE(attribution->'history', '[]'::jsonb)
             || jsonb_build_object(
                  'at', to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
                  'event', p_event_type,
                  'placement', v_label,
                  'campaign', p_campaign_id,
                  'page', p_page_path
                )
           )
         )
   WHERE id = v_customer;

  RETURN v_customer;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.ss_touch_service_credit()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.ss_transfer_stock_to_truck(p_truck_id uuid, p_item_id uuid, p_qty numeric)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  inv public.ss_inventory%ROWTYPE;
  v_after numeric;
  v_truck_after numeric;
BEGIN
  IF NOT public.ss_is_office() THEN
    RAISE EXCEPTION 'Office access required';
  END IF;
  IF coalesce(p_qty, 0) <= 0 THEN
    RAISE EXCEPTION 'Enter how many to move';
  END IF;

  SELECT * INTO inv FROM public.ss_inventory WHERE id = p_item_id;
  IF inv.id IS NULL THEN RAISE EXCEPTION 'Unknown part'; END IF;

  v_after := round(coalesce(inv.quantity, 0) - p_qty, 2);
  UPDATE public.ss_inventory SET quantity = v_after WHERE id = inv.id;

  INSERT INTO public.ss_truck_stock (truck_id, item_id, quantity)
  VALUES (p_truck_id, p_item_id, round(p_qty, 2))
  ON CONFLICT (truck_id, item_id)
  DO UPDATE SET quantity = round(public.ss_truck_stock.quantity + excluded.quantity, 2)
  RETURNING quantity INTO v_truck_after;

  INSERT INTO public.ss_inventory_moves
    (item_id, item_name, delta, quantity_after, reason, note, actor_id, truck_id, unit_cost, total_cost, entered_qty, entered_unit)
  VALUES
    (inv.id, inv.name, -round(p_qty, 2), v_after, 'transfer', 'Loaded onto truck', auth.uid(), p_truck_id,
     coalesce(inv.unit_cost, 0), round(p_qty * coalesce(inv.unit_cost, 0), 2), p_qty, inv.unit);

  RETURN jsonb_build_object('stockroom', v_after, 'truck', v_truck_after);
END;
$function$
;
CREATE OR REPLACE FUNCTION public.ss_update_inspection_status(_id uuid, _status text DEFAULT NULL::text, _eta_at timestamp with time zone DEFAULT NULL::timestamp with time zone, _eta_window text DEFAULT NULL::text, _customer_note text DEFAULT NULL::text, _clear_eta boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_row public.inspection_requests%ROWTYPE;
  v_status text;
  v_actor_email text;
BEGIN
  IF NOT public.ss_is_staff() THEN
    RAISE EXCEPTION 'Staff access required';
  END IF;

  SELECT * INTO v_row FROM public.inspection_requests WHERE id = _id FOR UPDATE;
  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'Inspection request not found';
  END IF;

  v_status := lower(nullif(btrim(coalesce(_status, '')), ''));
  IF v_status IS NOT NULL AND v_status NOT IN ('received','reviewing','scheduled','on_the_way','completed','cancelled') THEN
    RAISE EXCEPTION 'Unknown status: %', v_status;
  END IF;

  UPDATE public.inspection_requests SET
    status = coalesce(v_status, status),
    status_changed_at = CASE
      WHEN v_status IS NOT NULL AND v_status IS DISTINCT FROM status THEN now()
      ELSE status_changed_at END,
    eta_at = CASE WHEN _clear_eta THEN NULL ELSE coalesce(_eta_at, eta_at) END,
    eta_window = CASE WHEN _clear_eta THEN NULL ELSE coalesce(left(btrim(_eta_window), 80), eta_window) END,
    customer_note = CASE
      WHEN _customer_note IS NULL THEN customer_note
      ELSE nullif(left(btrim(_customer_note), 1000), '') END,
    assigned_staff_id = coalesce(assigned_staff_id, public.ss_my_staff_id()),
    updated_at = now()
  WHERE id = _id
  RETURNING * INTO v_row;

  SELECT email INTO v_actor_email FROM auth.users WHERE id = auth.uid();

  INSERT INTO public.admin_audit_log (user_id, user_email, area, action, record_type, record_id, details)
  VALUES (auth.uid(), v_actor_email, 'inspections', 'update_status', 'inspection_requests', _id::text,
          jsonb_build_object(
            'reference', v_row.reference_number,
            'status', v_row.status,
            'eta_at', v_row.eta_at,
            'eta_window', v_row.eta_window,
            'customer_note', v_row.customer_note
          ));

  RETURN jsonb_build_object(
    'ok', true,
    'id', v_row.id,
    'status', v_row.status,
    'eta_at', v_row.eta_at,
    'eta_window', v_row.eta_window,
    'customer_note', v_row.customer_note
  );
END;
$function$
;
CREATE OR REPLACE FUNCTION public.ss_validate_visit_window()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_dow smallint;
  v_avail record;
  v_conflict uuid;
BEGIN
  IF NEW.window_start IS NULL OR NEW.window_end IS NULL OR NEW.tech_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.window_end <= NEW.window_start THEN
    RAISE EXCEPTION 'Arrival window must end after it starts.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.ss_staff_time_off t
    WHERE t.tech_id = NEW.tech_id
      AND NEW.scheduled_date BETWEEN t.start_date AND t.end_date
  ) THEN
    RAISE EXCEPTION 'That technician is off on %.', NEW.scheduled_date;
  END IF;

  v_dow := EXTRACT(DOW FROM NEW.scheduled_date)::smallint;
  SELECT * INTO v_avail FROM public.ss_staff_availability a
    WHERE a.tech_id = NEW.tech_id AND a.weekday = v_dow AND a.is_active
      AND (a.effective_from IS NULL OR a.effective_from <= NEW.scheduled_date)
      AND (a.effective_to IS NULL OR a.effective_to >= NEW.scheduled_date)
    LIMIT 1;

  IF FOUND THEN
    IF NEW.window_start < v_avail.start_time OR NEW.window_end > v_avail.end_time THEN
      RAISE EXCEPTION 'That window is outside the technician''s working hours (% to %).', v_avail.start_time, v_avail.end_time;
    END IF;
  END IF;

  SELECT v.id INTO v_conflict FROM public.ss_visits v
   WHERE v.tech_id = NEW.tech_id
     AND v.scheduled_date = NEW.scheduled_date
     AND v.id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
     AND COALESCE(v.status, '') <> 'canceled'
     AND v.window_start IS NOT NULL AND v.window_end IS NOT NULL
     AND v.window_start < NEW.window_end
     AND v.window_end > NEW.window_start
   LIMIT 1;

  IF v_conflict IS NOT NULL THEN
    RAISE EXCEPTION 'That technician already has a stop booked in this window.';
  END IF;

  RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.ss_visit_parts(p_visit_id uuid)
 RETURNS TABLE(item_name text, qty numeric, unit text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT m.item_name,
         COALESCE(m.entered_qty, abs(m.delta))::numeric AS qty,
         COALESCE(m.entered_unit, 'ea')::text AS unit
  FROM public.ss_inventory_moves m
  JOIN public.ss_visits v ON v.id = m.visit_id
  WHERE m.visit_id = p_visit_id
    AND m.delta < 0
    AND (
      public.ss_is_staff()
      OR v.customer_id IN (SELECT public.ss_my_customer_ids())
    )
  ORDER BY m.created_at
$function$
;
CREATE OR REPLACE FUNCTION public.update_ss_native_push_tokens_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
;
-- Tables from the SavvySwim app

\restrict VDNfqZokZMgXWvc4yb8V7ivzeQSaaxuXc5dJUaSSCpn75xsntCQRA1Ganlr6yZQ






CREATE TABLE IF NOT EXISTS public.ss_access_attempts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    code_norm text NOT NULL,
    success boolean DEFAULT false NOT NULL,
    reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);



CREATE TABLE IF NOT EXISTS public.ss_access_codes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    customer_id uuid,
    full_name text,
    email text,
    phone text,
    address text,
    city text,
    state text,
    postal_code text,
    note text,
    status text DEFAULT 'active'::text NOT NULL,
    expires_at timestamp with time zone,
    created_by uuid,
    redeemed_by uuid,
    redeemed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    last_send_ok boolean,
    last_send_error text,
    last_send_email boolean,
    last_send_sms boolean
);



CREATE TABLE IF NOT EXISTS public.ss_access_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    email text,
    full_name text,
    phone text,
    address text NOT NULL,
    city text,
    state text,
    postal_code text,
    note text,
    status text DEFAULT 'pending'::text NOT NULL,
    reviewed_by uuid,
    reviewed_at timestamp with time zone,
    customer_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);



CREATE TABLE IF NOT EXISTS public.ss_backup_sync (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    entity text NOT NULL,
    record_id uuid NOT NULL,
    row_index integer,
    dirty boolean DEFAULT true NOT NULL,
    synced_at timestamp with time zone,
    last_error text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ss_backup_sync_entity_check CHECK ((entity = ANY (ARRAY['lead'::text, 'payment'::text])))
);



CREATE TABLE IF NOT EXISTS public.ss_bank_details (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    payee_name text DEFAULT 'Savvy Swim Pool Service'::text NOT NULL,
    mail_line1 text,
    mail_line2 text,
    mail_city text,
    mail_state text,
    mail_postal text,
    bank_name text,
    account_holder text,
    routing_number text,
    account_number text,
    ach_instructions text,
    memo_instructions text,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);



CREATE TABLE IF NOT EXISTS public.ss_calls (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    call_sid text,
    direction text DEFAULT 'inbound'::text NOT NULL,
    from_number text,
    to_number text,
    customer_id uuid,
    status text DEFAULT 'ringing'::text NOT NULL,
    outcome text,
    duration_seconds integer,
    recording_url text,
    transcript text,
    caller_city text,
    caller_state text,
    is_test boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);



CREATE TABLE IF NOT EXISTS public.ss_catalog_sync_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ran_at timestamp with time zone DEFAULT now() NOT NULL,
    actor_id uuid,
    actor_name text,
    environment text DEFAULT 'live'::text NOT NULL,
    mode text DEFAULT 'dry_run'::text NOT NULL,
    created_count integer DEFAULT 0 NOT NULL,
    updated_count integer DEFAULT 0 NOT NULL,
    skipped_count integer DEFAULT 0 NOT NULL,
    error_count integer DEFAULT 0 NOT NULL,
    changes jsonb DEFAULT '[]'::jsonb NOT NULL,
    errors jsonb DEFAULT '[]'::jsonb NOT NULL
);



CREATE TABLE IF NOT EXISTS public.ss_chat_channels (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    kind text DEFAULT 'team'::text NOT NULL,
    customer_id uuid,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    last_message_at timestamp with time zone,
    last_preview text,
    CONSTRAINT ss_chat_channels_kind_chk CHECK ((kind = ANY (ARRAY['team'::text, 'customer'::text])))
);



CREATE TABLE IF NOT EXISTS public.ss_chat_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    channel_id uuid NOT NULL,
    author_id uuid,
    author_name text,
    author_kind text DEFAULT 'staff'::text NOT NULL,
    body text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);



CREATE TABLE IF NOT EXISTS public.ss_check_payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    invoice_id uuid,
    customer_id uuid,
    amount numeric DEFAULT 0 NOT NULL,
    check_number text,
    delivery text DEFAULT 'mail'::text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    note text,
    received_at timestamp with time zone,
    cleared_at timestamp with time zone,
    handled_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    posted_payment_id uuid
);



CREATE TABLE IF NOT EXISTS public.ss_email_attachments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    message_id uuid NOT NULL,
    filename text NOT NULL,
    content_type text,
    size_bytes integer,
    storage_path text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);



CREATE TABLE IF NOT EXISTS public.ss_email_campaign_recipients (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    campaign_id uuid NOT NULL,
    lead_id uuid,
    email text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    sent_at timestamp with time zone,
    error text,
    message_id text,
    opened_at timestamp with time zone,
    clicked_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);



CREATE TABLE IF NOT EXISTS public.ss_email_campaigns (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    template_id uuid,
    audience_type text DEFAULT 'open_leads'::text NOT NULL,
    audience_filters jsonb DEFAULT '{}'::jsonb NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    scheduled_at timestamp with time zone,
    sent_at timestamp with time zone,
    sent_by uuid,
    subject text NOT NULL,
    body_html text NOT NULL,
    body_text text NOT NULL,
    from_address text,
    reply_to text,
    stats jsonb DEFAULT '{"sent": 0, "total": 0, "failed": 0, "bounced": 0, "rejected": 0, "delivered": 0, "suppressed": 0, "rate_limited": 0}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);



CREATE TABLE IF NOT EXISTS public.ss_email_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    thread_id uuid NOT NULL,
    direction text NOT NULL,
    from_email text NOT NULL,
    from_name text,
    to_email text NOT NULL,
    subject text,
    body_text text,
    body_html text,
    message_id text,
    in_reply_to text,
    refs text,
    sent_by uuid,
    is_read boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    attachment_expected_count integer DEFAULT 0 NOT NULL,
    attachment_saved_count integer DEFAULT 0 NOT NULL,
    attachment_failure_summary text,
    CONSTRAINT ss_email_messages_direction_check CHECK ((direction = ANY (ARRAY['in'::text, 'out'::text])))
);



CREATE TABLE IF NOT EXISTS public.ss_email_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    subject text NOT NULL,
    body_html text NOT NULL,
    body_text text NOT NULL,
    merge_tags text[] DEFAULT '{}'::text[] NOT NULL,
    is_default boolean DEFAULT false NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);



CREATE TABLE IF NOT EXISTS public.ss_email_threads (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    customer_id uuid,
    participant_email text NOT NULL,
    participant_name text,
    subject text DEFAULT '(no subject)'::text NOT NULL,
    status text DEFAULT 'open'::text NOT NULL,
    assigned_to uuid,
    unread_count integer DEFAULT 0 NOT NULL,
    last_direction text DEFAULT 'in'::text NOT NULL,
    last_message_at timestamp with time zone DEFAULT now() NOT NULL,
    last_snippet text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ss_email_threads_last_direction_check CHECK ((last_direction = ANY (ARRAY['in'::text, 'out'::text]))),
    CONSTRAINT ss_email_threads_status_check CHECK ((status = ANY (ARRAY['open'::text, 'archived'::text])))
);



CREATE TABLE IF NOT EXISTS public.ss_internal_notes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lead_id uuid,
    customer_id uuid,
    body text NOT NULL,
    pinned boolean DEFAULT false NOT NULL,
    author_id uuid,
    author_name text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);



CREATE TABLE IF NOT EXISTS public.ss_internal_tasks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lead_id uuid,
    customer_id uuid,
    title text NOT NULL,
    details text,
    due_at timestamp with time zone,
    priority text DEFAULT 'normal'::text NOT NULL,
    status text DEFAULT 'open'::text NOT NULL,
    assigned_to uuid,
    completed_at timestamp with time zone,
    created_by uuid,
    created_by_name text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    escalation_level integer DEFAULT 0 NOT NULL,
    last_escalated_at timestamp with time zone,
    escalated_from uuid
);



CREATE TABLE IF NOT EXISTS public.ss_invoice_reconciliation (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    invoice_id uuid NOT NULL,
    crm_total numeric DEFAULT 0 NOT NULL,
    stripe_amount numeric,
    currency text DEFAULT 'usd'::text NOT NULL,
    stripe_session_id text,
    difference numeric DEFAULT 0 NOT NULL,
    state text DEFAULT 'unlinked'::text NOT NULL,
    note text,
    acknowledged_by uuid,
    acknowledged_at timestamp with time zone,
    checked_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);



CREATE TABLE IF NOT EXISTS public.ss_lead_appointments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lead_id uuid NOT NULL,
    customer_id uuid,
    starts_at timestamp with time zone NOT NULL,
    ends_at timestamp with time zone NOT NULL,
    assigned_staff_id uuid,
    kind text DEFAULT 'inspection'::text NOT NULL,
    status text DEFAULT 'scheduled'::text NOT NULL,
    location text,
    notes text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);



CREATE TABLE IF NOT EXISTS public.ss_native_push_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    token text NOT NULL,
    platform text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ss_native_push_tokens_platform_check CHECK ((platform = ANY (ARRAY['ios'::text, 'android'::text])))
);



CREATE TABLE IF NOT EXISTS public.ss_notification_prefs (
    user_id uuid NOT NULL,
    role_change_in_app boolean DEFAULT true NOT NULL,
    role_change_email boolean DEFAULT true NOT NULL,
    role_change_sms boolean DEFAULT false NOT NULL,
    account_in_app boolean DEFAULT true NOT NULL,
    account_email boolean DEFAULT true NOT NULL,
    account_sms boolean DEFAULT false NOT NULL,
    lead_sla_in_app boolean DEFAULT true NOT NULL,
    lead_sla_email boolean DEFAULT false NOT NULL,
    lead_sla_sms boolean DEFAULT false NOT NULL,
    sms_number text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    visit_in_app boolean DEFAULT true NOT NULL,
    visit_email boolean DEFAULT true NOT NULL,
    visit_sms boolean DEFAULT true NOT NULL,
    visit_push boolean DEFAULT true NOT NULL,
    role_change_push boolean DEFAULT false NOT NULL,
    account_push boolean DEFAULT false NOT NULL,
    lead_sla_push boolean DEFAULT false NOT NULL
);



CREATE TABLE IF NOT EXISTS public.ss_notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    kind text DEFAULT 'account'::text NOT NULL,
    title text NOT NULL,
    body text,
    link text,
    read_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);



CREATE TABLE IF NOT EXISTS public.ss_payment_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    customer_id uuid,
    invoice_id uuid,
    kind text NOT NULL,
    status text,
    amount numeric(10,2),
    method text,
    stripe_event_id text,
    stripe_session_id text,
    webhook_ok boolean,
    error_message text,
    detail jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    currency text DEFAULT 'usd'::text NOT NULL,
    stripe_amount numeric(10,2)
);

ALTER TABLE ONLY public.ss_payment_events REPLICA IDENTITY FULL;



COMMENT ON COLUMN public.ss_payment_events.currency IS 'ISO currency code reported by Stripe for this event.';



COMMENT ON COLUMN public.ss_payment_events.stripe_amount IS 'Exact total Stripe confirmed, in the major unit of currency.';



CREATE TABLE IF NOT EXISTS public.ss_payment_pickups (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    visit_id uuid,
    customer_id uuid NOT NULL,
    method text DEFAULT 'check'::text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    photo_path text,
    tech_note text,
    collected_by uuid,
    collected_at timestamp with time zone,
    admin_confirmed_at timestamp with time zone,
    admin_note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    scheduled_for date,
    assigned_tech_id uuid,
    pickup_address text,
    office_note text,
    created_by uuid,
    requested_by_customer boolean DEFAULT false NOT NULL,
    customer_note text,
    collected_amount numeric,
    CONSTRAINT ss_payment_pickups_method_chk CHECK ((method = ANY (ARRAY['check'::text, 'cash'::text, 'zelle'::text]))),
    CONSTRAINT ss_payment_pickups_status_chk CHECK ((status = ANY (ARRAY['requested'::text, 'pending'::text, 'collected'::text, 'not_left'::text, 'confirmed'::text, 'missing'::text])))
);



CREATE TABLE IF NOT EXISTS public.ss_payment_proofs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    invoice_id uuid NOT NULL,
    customer_id uuid NOT NULL,
    method text NOT NULL,
    image_path text NOT NULL,
    note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ss_payment_proofs_method_check CHECK ((method = ANY (ARRAY['check'::text, 'zelle'::text])))
);



CREATE TABLE IF NOT EXISTS public.ss_phone_optouts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    phone text NOT NULL,
    keyword text,
    opted_out_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);



CREATE TABLE IF NOT EXISTS public.ss_pool_costs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    customer_id uuid NOT NULL,
    visits_per_month numeric DEFAULT 4.33 NOT NULL,
    tech_pay_per_visit numeric,
    chem_cost_per_visit numeric DEFAULT 11 NOT NULL,
    chem_supplied_by_customer boolean DEFAULT false NOT NULL,
    extra_lines jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    target_margin_pct numeric
);



CREATE TABLE IF NOT EXISTS public.ss_pricing_settings (
    key text NOT NULL,
    value jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);



CREATE TABLE IF NOT EXISTS public.ss_push_subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    endpoint text NOT NULL,
    p256dh text NOT NULL,
    auth text NOT NULL,
    user_agent text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);



CREATE TABLE IF NOT EXISTS public.ss_qr_batches (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    batch_number integer NOT NULL,
    size integer NOT NULL,
    format text DEFAULT 'avery5160'::text NOT NULL,
    first_tag text NOT NULL,
    last_tag text NOT NULL,
    created_by uuid,
    note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);



CREATE TABLE IF NOT EXISTS public.ss_qr_scans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tag_id text NOT NULL,
    customer_id uuid,
    visit_id uuid,
    staff_id uuid,
    scanned_at timestamp with time zone DEFAULT now() NOT NULL,
    lat numeric,
    lng numeric,
    accuracy_m numeric,
    distance_ft numeric,
    outcome text DEFAULT 'ok'::text NOT NULL,
    user_agent text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    input_source text DEFAULT 'qr'::text NOT NULL,
    CONSTRAINT ss_qr_scans_input_source_check CHECK ((input_source = ANY (ARRAY['qr'::text, 'typed_number'::text])))
);



CREATE TABLE IF NOT EXISTS public.ss_qr_tags (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tag_id text NOT NULL,
    customer_id uuid,
    status text DEFAULT 'printed'::text NOT NULL,
    linked_by uuid,
    linked_at timestamp with time zone,
    first_scanned_at timestamp with time zone,
    last_scanned_at timestamp with time zone,
    note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    qr_url text,
    batch_id uuid,
    printed_at timestamp with time zone,
    created_by uuid,
    disabled_at timestamp with time zone,
    disabled_reason text,
    replaced_by_tag text,
    service_address_id uuid,
    water_body_id uuid,
    CONSTRAINT ss_qr_tags_status_check CHECK ((status = ANY (ARRAY['printed'::text, 'assigned'::text, 'disabled'::text])))
);



CREATE TABLE IF NOT EXISTS public.ss_quote_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    plan_id text NOT NULL,
    chem_included boolean DEFAULT false NOT NULL,
    lines jsonb DEFAULT '[]'::jsonb NOT NULL,
    defaults jsonb DEFAULT '{}'::jsonb NOT NULL,
    is_default boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 100 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);



CREATE TABLE IF NOT EXISTS public.ss_report_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    customer_id uuid,
    visit_id uuid,
    actor_user_id uuid,
    actor_role text DEFAULT 'customer'::text NOT NULL,
    kind text DEFAULT 'visit'::text NOT NULL,
    action text NOT NULL,
    status text DEFAULT 'success'::text NOT NULL,
    attempt integer DEFAULT 1 NOT NULL,
    error text,
    recipient text,
    filename text,
    bytes integer,
    property_label text,
    date_label text,
    meta jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);



CREATE TABLE IF NOT EXISTS public.ss_sla_alerts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    task_id uuid,
    user_id uuid,
    channel text NOT NULL,
    template_key text NOT NULL,
    recipient text,
    subject text,
    body text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    error text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    sent_at timestamp with time zone,
    CONSTRAINT ss_sla_alerts_channel_check CHECK ((channel = ANY (ARRAY['email'::text, 'sms'::text]))),
    CONSTRAINT ss_sla_alerts_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'sent'::text, 'failed'::text, 'skipped'::text])))
);



CREATE TABLE IF NOT EXISTS public.ss_sla_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    scope text NOT NULL,
    lead_id uuid,
    customer_id uuid,
    label text,
    enabled boolean DEFAULT true NOT NULL,
    warn_hours numeric,
    escalate_hours numeric,
    reassign_hours numeric,
    fallback_user_id uuid,
    notify_office boolean,
    channels jsonb DEFAULT '{"sms": false, "email": false, "in_app": true}'::jsonb NOT NULL,
    notes text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ss_sla_rules_scope_check CHECK ((scope = ANY (ARRAY['lead'::text, 'customer'::text]))),
    CONSTRAINT ss_sla_rules_target CHECK ((((scope = 'lead'::text) AND (lead_id IS NOT NULL) AND (customer_id IS NULL)) OR ((scope = 'customer'::text) AND (customer_id IS NOT NULL) AND (lead_id IS NULL))))
);



CREATE TABLE IF NOT EXISTS public.ss_sla_templates (
    key text NOT NULL,
    display_name text NOT NULL,
    title_tpl text NOT NULL,
    body_tpl text NOT NULL,
    channels jsonb DEFAULT '{"sms": false, "email": false, "in_app": true}'::jsonb NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);



CREATE TABLE IF NOT EXISTS public.ss_staff_availability (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tech_id uuid NOT NULL,
    weekday smallint NOT NULL,
    start_time time without time zone DEFAULT '08:00:00'::time without time zone NOT NULL,
    end_time time without time zone DEFAULT '17:00:00'::time without time zone NOT NULL,
    window_minutes integer DEFAULT 120 NOT NULL,
    max_stops integer,
    effective_from date,
    effective_to date,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ss_staff_availability_weekday_check CHECK (((weekday >= 0) AND (weekday <= 6))),
    CONSTRAINT ss_staff_availability_window_minutes_check CHECK (((window_minutes >= 30) AND (window_minutes <= 480)))
);



CREATE TABLE IF NOT EXISTS public.ss_staff_time_off (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tech_id uuid NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);



CREATE TABLE IF NOT EXISTS public.ss_task_audit (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    batch_id uuid NOT NULL,
    task_id uuid NOT NULL,
    lead_id uuid,
    customer_id uuid,
    action text NOT NULL,
    source text DEFAULT 'bulk_update_tasks'::text NOT NULL,
    actor_id uuid,
    actor_name text,
    changed_fields text[] DEFAULT '{}'::text[] NOT NULL,
    before jsonb DEFAULT '{}'::jsonb NOT NULL,
    after jsonb DEFAULT '{}'::jsonb NOT NULL,
    filters jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);



CREATE TABLE IF NOT EXISTS public.ss_truck_stock (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    truck_id uuid NOT NULL,
    item_id uuid NOT NULL,
    quantity numeric DEFAULT 0 NOT NULL,
    low_threshold numeric DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);



CREATE TABLE IF NOT EXISTS public.ss_vault_logins (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    url text,
    username text,
    secret_cipher text,
    account_number text,
    category text DEFAULT 'Supplies'::text NOT NULL,
    vendor_id uuid,
    notes text,
    updated_by uuid,
    updated_by_name text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);



CREATE TABLE IF NOT EXISTS public.ss_vendors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    contact_name text,
    phone text,
    email text,
    website text,
    address text,
    account_number text,
    supplies text,
    notes text,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);



CREATE TABLE IF NOT EXISTS public.ss_visit_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    customer_id uuid NOT NULL,
    requested_date date NOT NULL,
    window_start time without time zone,
    window_end time without time zone,
    reason text,
    note text,
    status text DEFAULT 'pending'::text NOT NULL,
    quoted_price numeric,
    office_note text,
    visit_id uuid,
    decided_by uuid,
    decided_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ss_visit_requests_status_chk CHECK ((status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'declined'::text])))
);



CREATE TABLE IF NOT EXISTS public.ss_webhook_secret_usage (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    key_used text NOT NULL,
    endpoint text NOT NULL,
    caller_origin text,
    hit_count integer DEFAULT 0 NOT NULL,
    last_used_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ss_webhook_secret_usage_key_used_check CHECK ((key_used = ANY (ARRAY['current'::text, 'previous'::text])))
);



ALTER TABLE ONLY public.ss_access_attempts
    ADD CONSTRAINT ss_access_attempts_pkey PRIMARY KEY (id);



ALTER TABLE ONLY public.ss_access_codes
    ADD CONSTRAINT ss_access_codes_code_key UNIQUE (code);



ALTER TABLE ONLY public.ss_access_codes
    ADD CONSTRAINT ss_access_codes_pkey PRIMARY KEY (id);



ALTER TABLE ONLY public.ss_access_requests
    ADD CONSTRAINT ss_access_requests_pkey PRIMARY KEY (id);



ALTER TABLE ONLY public.ss_backup_sync
    ADD CONSTRAINT ss_backup_sync_entity_record_id_key UNIQUE (entity, record_id);



ALTER TABLE ONLY public.ss_backup_sync
    ADD CONSTRAINT ss_backup_sync_pkey PRIMARY KEY (id);



ALTER TABLE ONLY public.ss_bank_details
    ADD CONSTRAINT ss_bank_details_pkey PRIMARY KEY (id);



ALTER TABLE ONLY public.ss_calls
    ADD CONSTRAINT ss_calls_call_sid_key UNIQUE (call_sid);



ALTER TABLE ONLY public.ss_calls
    ADD CONSTRAINT ss_calls_pkey PRIMARY KEY (id);



ALTER TABLE ONLY public.ss_catalog_sync_log
    ADD CONSTRAINT ss_catalog_sync_log_pkey PRIMARY KEY (id);



ALTER TABLE ONLY public.ss_chat_channels
    ADD CONSTRAINT ss_chat_channels_pkey PRIMARY KEY (id);



ALTER TABLE ONLY public.ss_chat_messages
    ADD CONSTRAINT ss_chat_messages_pkey PRIMARY KEY (id);



ALTER TABLE ONLY public.ss_check_payments
    ADD CONSTRAINT ss_check_payments_pkey PRIMARY KEY (id);



ALTER TABLE ONLY public.ss_email_attachments
    ADD CONSTRAINT ss_email_attachments_pkey PRIMARY KEY (id);



ALTER TABLE ONLY public.ss_email_campaign_recipients
    ADD CONSTRAINT ss_email_campaign_recipients_pkey PRIMARY KEY (id);



ALTER TABLE ONLY public.ss_email_campaigns
    ADD CONSTRAINT ss_email_campaigns_pkey PRIMARY KEY (id);



ALTER TABLE ONLY public.ss_email_messages
    ADD CONSTRAINT ss_email_messages_pkey PRIMARY KEY (id);



ALTER TABLE ONLY public.ss_email_templates
    ADD CONSTRAINT ss_email_templates_pkey PRIMARY KEY (id);



ALTER TABLE ONLY public.ss_email_threads
    ADD CONSTRAINT ss_email_threads_pkey PRIMARY KEY (id);



ALTER TABLE ONLY public.ss_internal_notes
    ADD CONSTRAINT ss_internal_notes_pkey PRIMARY KEY (id);



ALTER TABLE ONLY public.ss_internal_tasks
    ADD CONSTRAINT ss_internal_tasks_pkey PRIMARY KEY (id);



ALTER TABLE ONLY public.ss_invoice_reconciliation
    ADD CONSTRAINT ss_invoice_reconciliation_invoice_id_key UNIQUE (invoice_id);



ALTER TABLE ONLY public.ss_invoice_reconciliation
    ADD CONSTRAINT ss_invoice_reconciliation_pkey PRIMARY KEY (id);



ALTER TABLE ONLY public.ss_lead_appointments
    ADD CONSTRAINT ss_lead_appointments_pkey PRIMARY KEY (id);



ALTER TABLE ONLY public.ss_native_push_tokens
    ADD CONSTRAINT ss_native_push_tokens_pkey PRIMARY KEY (id);



ALTER TABLE ONLY public.ss_native_push_tokens
    ADD CONSTRAINT ss_native_push_tokens_user_id_token_key UNIQUE (user_id, token);



ALTER TABLE ONLY public.ss_notification_prefs
    ADD CONSTRAINT ss_notification_prefs_pkey PRIMARY KEY (user_id);



ALTER TABLE ONLY public.ss_notifications
    ADD CONSTRAINT ss_notifications_pkey PRIMARY KEY (id);



ALTER TABLE ONLY public.ss_payment_events
    ADD CONSTRAINT ss_payment_events_pkey PRIMARY KEY (id);



ALTER TABLE ONLY public.ss_payment_pickups
    ADD CONSTRAINT ss_payment_pickups_pkey PRIMARY KEY (id);



ALTER TABLE ONLY public.ss_payment_pickups
    ADD CONSTRAINT ss_payment_pickups_visit_uniq UNIQUE (visit_id);



ALTER TABLE ONLY public.ss_payment_proofs
    ADD CONSTRAINT ss_payment_proofs_pkey PRIMARY KEY (id);



ALTER TABLE ONLY public.ss_phone_optouts
    ADD CONSTRAINT ss_phone_optouts_phone_key UNIQUE (phone);



ALTER TABLE ONLY public.ss_phone_optouts
    ADD CONSTRAINT ss_phone_optouts_pkey PRIMARY KEY (id);



ALTER TABLE ONLY public.ss_pool_costs
    ADD CONSTRAINT ss_pool_costs_customer_id_key UNIQUE (customer_id);



ALTER TABLE ONLY public.ss_pool_costs
    ADD CONSTRAINT ss_pool_costs_pkey PRIMARY KEY (id);



ALTER TABLE ONLY public.ss_pricing_settings
    ADD CONSTRAINT ss_pricing_settings_pkey PRIMARY KEY (key);



ALTER TABLE ONLY public.ss_push_subscriptions
    ADD CONSTRAINT ss_push_subscriptions_endpoint_key UNIQUE (endpoint);



ALTER TABLE ONLY public.ss_push_subscriptions
    ADD CONSTRAINT ss_push_subscriptions_pkey PRIMARY KEY (id);



ALTER TABLE ONLY public.ss_qr_batches
    ADD CONSTRAINT ss_qr_batches_pkey PRIMARY KEY (id);



ALTER TABLE ONLY public.ss_qr_scans
    ADD CONSTRAINT ss_qr_scans_pkey PRIMARY KEY (id);



ALTER TABLE ONLY public.ss_qr_tags
    ADD CONSTRAINT ss_qr_tags_pkey PRIMARY KEY (id);



ALTER TABLE ONLY public.ss_qr_tags
    ADD CONSTRAINT ss_qr_tags_tag_id_key UNIQUE (tag_id);



ALTER TABLE ONLY public.ss_quote_templates
    ADD CONSTRAINT ss_quote_templates_pkey PRIMARY KEY (id);



ALTER TABLE ONLY public.ss_quote_templates
    ADD CONSTRAINT ss_quote_templates_slug_key UNIQUE (slug);



ALTER TABLE ONLY public.ss_report_events
    ADD CONSTRAINT ss_report_events_pkey PRIMARY KEY (id);



ALTER TABLE ONLY public.ss_sla_alerts
    ADD CONSTRAINT ss_sla_alerts_pkey PRIMARY KEY (id);



ALTER TABLE ONLY public.ss_sla_rules
    ADD CONSTRAINT ss_sla_rules_pkey PRIMARY KEY (id);



ALTER TABLE ONLY public.ss_sla_templates
    ADD CONSTRAINT ss_sla_templates_pkey PRIMARY KEY (key);



ALTER TABLE ONLY public.ss_staff_availability
    ADD CONSTRAINT ss_staff_availability_pkey PRIMARY KEY (id);



ALTER TABLE ONLY public.ss_staff_availability
    ADD CONSTRAINT ss_staff_availability_tech_id_weekday_key UNIQUE (tech_id, weekday);



ALTER TABLE ONLY public.ss_staff_time_off
    ADD CONSTRAINT ss_staff_time_off_pkey PRIMARY KEY (id);



ALTER TABLE ONLY public.ss_task_audit
    ADD CONSTRAINT ss_task_audit_pkey PRIMARY KEY (id);



ALTER TABLE ONLY public.ss_truck_stock
    ADD CONSTRAINT ss_truck_stock_pkey PRIMARY KEY (id);



ALTER TABLE ONLY public.ss_truck_stock
    ADD CONSTRAINT ss_truck_stock_truck_id_item_id_key UNIQUE (truck_id, item_id);



ALTER TABLE ONLY public.ss_vault_logins
    ADD CONSTRAINT ss_vault_logins_pkey PRIMARY KEY (id);



ALTER TABLE ONLY public.ss_vendors
    ADD CONSTRAINT ss_vendors_pkey PRIMARY KEY (id);



ALTER TABLE ONLY public.ss_visit_requests
    ADD CONSTRAINT ss_visit_requests_pkey PRIMARY KEY (id);



ALTER TABLE ONLY public.ss_webhook_secret_usage
    ADD CONSTRAINT ss_webhook_secret_usage_key_used_endpoint_key UNIQUE (key_used, endpoint);



ALTER TABLE ONLY public.ss_webhook_secret_usage
    ADD CONSTRAINT ss_webhook_secret_usage_pkey PRIMARY KEY (id);



CREATE INDEX idx_ss_invoice_recon_state ON public.ss_invoice_reconciliation USING btree (state);



CREATE INDEX ss_access_attempts_code_idx ON public.ss_access_attempts USING btree (code_norm, created_at DESC);



CREATE INDEX ss_access_attempts_user_idx ON public.ss_access_attempts USING btree (user_id, created_at DESC);



CREATE UNIQUE INDEX ss_access_codes_norm_uidx ON public.ss_access_codes USING btree (upper(regexp_replace(code, '[^A-Za-z0-9]'::text, ''::text, 'g'::text)));



CREATE INDEX ss_backup_sync_dirty_idx ON public.ss_backup_sync USING btree (entity, dirty) WHERE dirty;



CREATE INDEX ss_calls_created_idx ON public.ss_calls USING btree (created_at DESC);



CREATE INDEX ss_catalog_sync_log_ran_at_idx ON public.ss_catalog_sync_log USING btree (ran_at DESC);



CREATE UNIQUE INDEX ss_chat_channels_customer_uniq ON public.ss_chat_channels USING btree (customer_id) WHERE (customer_id IS NOT NULL);



CREATE INDEX ss_chat_messages_channel_idx ON public.ss_chat_messages USING btree (channel_id, created_at);



CREATE INDEX ss_email_attachments_message_idx ON public.ss_email_attachments USING btree (message_id);



CREATE INDEX ss_email_campaign_recipients_campaign_idx ON public.ss_email_campaign_recipients USING btree (campaign_id, status);



CREATE INDEX ss_email_campaign_recipients_lead_idx ON public.ss_email_campaign_recipients USING btree (lead_id);



CREATE INDEX ss_email_campaigns_status_idx ON public.ss_email_campaigns USING btree (status, scheduled_at);



CREATE UNIQUE INDEX ss_email_messages_message_id_idx ON public.ss_email_messages USING btree (message_id) WHERE (message_id IS NOT NULL);



CREATE INDEX ss_email_messages_thread_idx ON public.ss_email_messages USING btree (thread_id, created_at);



CREATE INDEX ss_email_templates_default_idx ON public.ss_email_templates USING btree (is_default);



CREATE INDEX ss_email_threads_participant_idx ON public.ss_email_threads USING btree (lower(participant_email));



CREATE INDEX ss_email_threads_recent_idx ON public.ss_email_threads USING btree (last_message_at DESC);



CREATE INDEX ss_internal_notes_customer_idx ON public.ss_internal_notes USING btree (customer_id, created_at DESC);



CREATE INDEX ss_internal_notes_lead_idx ON public.ss_internal_notes USING btree (lead_id, created_at DESC);



CREATE INDEX ss_internal_tasks_customer_idx ON public.ss_internal_tasks USING btree (customer_id, created_at DESC);



CREATE INDEX ss_internal_tasks_lead_idx ON public.ss_internal_tasks USING btree (lead_id, created_at DESC);



CREATE INDEX ss_internal_tasks_overdue_idx ON public.ss_internal_tasks USING btree (status, due_at) WHERE (status = 'open'::text);



CREATE INDEX ss_lead_appointments_lead_idx ON public.ss_lead_appointments USING btree (lead_id);



CREATE INDEX ss_lead_appointments_starts_idx ON public.ss_lead_appointments USING btree (starts_at);



CREATE INDEX ss_notifications_user_idx ON public.ss_notifications USING btree (user_id, created_at DESC);



CREATE INDEX ss_payment_events_customer_idx ON public.ss_payment_events USING btree (customer_id, created_at DESC);



CREATE INDEX ss_payment_events_invoice_idx ON public.ss_payment_events USING btree (invoice_id);



CREATE INDEX ss_payment_pickups_customer_idx ON public.ss_payment_pickups USING btree (customer_id, scheduled_for);



CREATE INDEX ss_payment_pickups_sched_idx ON public.ss_payment_pickups USING btree (scheduled_for, assigned_tech_id);



CREATE UNIQUE INDEX ss_qr_batches_number_key ON public.ss_qr_batches USING btree (batch_number);



CREATE INDEX ss_qr_scans_input_source_idx ON public.ss_qr_scans USING btree (input_source, scanned_at DESC);



CREATE INDEX ss_qr_scans_outcome_idx ON public.ss_qr_scans USING btree (outcome, scanned_at DESC);



CREATE INDEX ss_qr_scans_staff_idx ON public.ss_qr_scans USING btree (staff_id, scanned_at DESC);



CREATE INDEX ss_qr_scans_tag_idx ON public.ss_qr_scans USING btree (tag_id, scanned_at DESC);



CREATE INDEX ss_qr_tags_batch_idx ON public.ss_qr_tags USING btree (batch_id);



CREATE INDEX ss_qr_tags_customer_idx ON public.ss_qr_tags USING btree (customer_id);



CREATE INDEX ss_qr_tags_status_idx ON public.ss_qr_tags USING btree (status, last_scanned_at DESC);



CREATE UNIQUE INDEX ss_quote_templates_one_default_per_plan ON public.ss_quote_templates USING btree (plan_id) WHERE (is_default AND is_active);



CREATE INDEX ss_report_events_created_idx ON public.ss_report_events USING btree (created_at DESC);



CREATE INDEX ss_report_events_customer_idx ON public.ss_report_events USING btree (customer_id, created_at DESC);



CREATE INDEX ss_sla_alerts_pending_idx ON public.ss_sla_alerts USING btree (status, created_at) WHERE (status = 'pending'::text);



CREATE UNIQUE INDEX ss_sla_rules_customer_uniq ON public.ss_sla_rules USING btree (customer_id) WHERE (customer_id IS NOT NULL);



CREATE UNIQUE INDEX ss_sla_rules_lead_uniq ON public.ss_sla_rules USING btree (lead_id) WHERE (lead_id IS NOT NULL);



CREATE INDEX ss_task_audit_batch_idx ON public.ss_task_audit USING btree (batch_id);



CREATE INDEX ss_task_audit_created_idx ON public.ss_task_audit USING btree (created_at DESC);



CREATE INDEX ss_task_audit_task_idx ON public.ss_task_audit USING btree (task_id, created_at DESC);



CREATE INDEX ss_vault_logins_name_idx ON public.ss_vault_logins USING btree (name);



CREATE INDEX ss_visit_requests_customer_idx ON public.ss_visit_requests USING btree (customer_id, created_at DESC);



CREATE INDEX ss_visit_requests_pending_idx ON public.ss_visit_requests USING btree (status, requested_date);



CREATE TRIGGER ss_access_codes_touch BEFORE UPDATE ON public.ss_access_codes FOR EACH ROW EXECUTE FUNCTION public.ss_touch_updated_at();



CREATE TRIGGER ss_access_requests_touch BEFORE UPDATE ON public.ss_access_requests FOR EACH ROW EXECUTE FUNCTION public.ss_touch_updated_at();



CREATE TRIGGER ss_bank_details_touch BEFORE UPDATE ON public.ss_bank_details FOR EACH ROW EXECUTE FUNCTION public.ss_touch_updated_at();



CREATE TRIGGER ss_calls_touch BEFORE UPDATE ON public.ss_calls FOR EACH ROW EXECUTE FUNCTION public.ss_touch_updated_at();



CREATE TRIGGER ss_chat_messages_touch AFTER INSERT ON public.ss_chat_messages FOR EACH ROW EXECUTE FUNCTION public.ss_tg_chat_touch();



CREATE TRIGGER ss_check_payments_touch BEFORE UPDATE ON public.ss_check_payments FOR EACH ROW EXECUTE FUNCTION public.ss_touch_updated_at();



CREATE TRIGGER ss_email_threads_touch BEFORE UPDATE ON public.ss_email_threads FOR EACH ROW EXECUTE FUNCTION public.ss_touch_updated_at();



CREATE TRIGGER ss_internal_tasks_touch BEFORE UPDATE ON public.ss_internal_tasks FOR EACH ROW EXECUTE FUNCTION public.ss_touch_updated_at();



CREATE TRIGGER ss_lead_appointments_touch BEFORE UPDATE ON public.ss_lead_appointments FOR EACH ROW EXECUTE FUNCTION public.ss_touch_updated_at();



CREATE TRIGGER ss_notification_prefs_touch BEFORE UPDATE ON public.ss_notification_prefs FOR EACH ROW EXECUTE FUNCTION public.ss_touch_updated_at();



CREATE TRIGGER ss_phone_optouts_touch BEFORE UPDATE ON public.ss_phone_optouts FOR EACH ROW EXECUTE FUNCTION public.ss_touch_updated_at();



CREATE TRIGGER ss_pool_costs_touch BEFORE UPDATE ON public.ss_pool_costs FOR EACH ROW EXECUTE FUNCTION public.ss_touch_updated_at();



CREATE TRIGGER ss_pricing_settings_touch BEFORE UPDATE ON public.ss_pricing_settings FOR EACH ROW EXECUTE FUNCTION public.ss_touch_updated_at();



CREATE TRIGGER ss_push_subscriptions_touch BEFORE UPDATE ON public.ss_push_subscriptions FOR EACH ROW EXECUTE FUNCTION public.ss_touch_updated_at();



CREATE TRIGGER ss_qr_batches_updated BEFORE UPDATE ON public.ss_qr_batches FOR EACH ROW EXECUTE FUNCTION public.ss_touch_updated_at();



CREATE TRIGGER ss_qr_tags_updated BEFORE UPDATE ON public.ss_qr_tags FOR EACH ROW EXECUTE FUNCTION public.ss_touch_updated_at();



CREATE TRIGGER ss_quote_templates_updated_at BEFORE UPDATE ON public.ss_quote_templates FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();



CREATE TRIGGER ss_staff_availability_touch BEFORE UPDATE ON public.ss_staff_availability FOR EACH ROW EXECUTE FUNCTION public.ss_touch_updated_at();



CREATE TRIGGER ss_staff_time_off_touch BEFORE UPDATE ON public.ss_staff_time_off FOR EACH ROW EXECUTE FUNCTION public.ss_touch_updated_at();



CREATE TRIGGER ss_truck_stock_updated_at BEFORE UPDATE ON public.ss_truck_stock FOR EACH ROW EXECUTE FUNCTION public.ss_touch_updated_at();



CREATE TRIGGER ss_vault_logins_touch BEFORE UPDATE ON public.ss_vault_logins FOR EACH ROW EXECUTE FUNCTION public.ss_touch_updated_at();



CREATE TRIGGER ss_vendors_touch BEFORE UPDATE ON public.ss_vendors FOR EACH ROW EXECUTE FUNCTION public.ss_touch_updated_at();



CREATE TRIGGER ss_visit_requests_updated_at BEFORE UPDATE ON public.ss_visit_requests FOR EACH ROW EXECUTE FUNCTION public.ss_touch_updated_at();



CREATE TRIGGER trg_ss_invoice_recon_touch BEFORE UPDATE ON public.ss_invoice_reconciliation FOR EACH ROW EXECUTE FUNCTION public.ss_touch_updated_at();



CREATE TRIGGER update_ss_native_push_tokens_updated_at BEFORE UPDATE ON public.ss_native_push_tokens FOR EACH ROW EXECUTE FUNCTION public.update_ss_native_push_tokens_updated_at();



ALTER TABLE ONLY public.ss_access_codes
    ADD CONSTRAINT ss_access_codes_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.ss_customers(id) ON DELETE SET NULL;



ALTER TABLE ONLY public.ss_access_requests
    ADD CONSTRAINT ss_access_requests_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.ss_customers(id) ON DELETE SET NULL;



ALTER TABLE ONLY public.ss_calls
    ADD CONSTRAINT ss_calls_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.ss_customers(id) ON DELETE SET NULL;



ALTER TABLE ONLY public.ss_chat_channels
    ADD CONSTRAINT ss_chat_channels_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.ss_customers(id) ON DELETE CASCADE;



ALTER TABLE ONLY public.ss_chat_messages
    ADD CONSTRAINT ss_chat_messages_channel_id_fkey FOREIGN KEY (channel_id) REFERENCES public.ss_chat_channels(id) ON DELETE CASCADE;



ALTER TABLE ONLY public.ss_check_payments
    ADD CONSTRAINT ss_check_payments_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.ss_customers(id) ON DELETE CASCADE;



ALTER TABLE ONLY public.ss_check_payments
    ADD CONSTRAINT ss_check_payments_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.ss_invoices(id) ON DELETE CASCADE;



ALTER TABLE ONLY public.ss_check_payments
    ADD CONSTRAINT ss_check_payments_posted_payment_id_fkey FOREIGN KEY (posted_payment_id) REFERENCES public.ss_payments(id) ON DELETE SET NULL;



ALTER TABLE ONLY public.ss_email_attachments
    ADD CONSTRAINT ss_email_attachments_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.ss_email_messages(id) ON DELETE CASCADE;



ALTER TABLE ONLY public.ss_email_campaign_recipients
    ADD CONSTRAINT ss_email_campaign_recipients_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.ss_email_campaigns(id) ON DELETE CASCADE;



ALTER TABLE ONLY public.ss_email_campaign_recipients
    ADD CONSTRAINT ss_email_campaign_recipients_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.ss_leads(id) ON DELETE SET NULL;



ALTER TABLE ONLY public.ss_email_campaigns
    ADD CONSTRAINT ss_email_campaigns_sent_by_fkey FOREIGN KEY (sent_by) REFERENCES public.ss_staff(id) ON DELETE SET NULL;



ALTER TABLE ONLY public.ss_email_campaigns
    ADD CONSTRAINT ss_email_campaigns_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.ss_email_templates(id) ON DELETE SET NULL;



ALTER TABLE ONLY public.ss_email_messages
    ADD CONSTRAINT ss_email_messages_sent_by_fkey FOREIGN KEY (sent_by) REFERENCES public.ss_staff(id) ON DELETE SET NULL;



ALTER TABLE ONLY public.ss_email_messages
    ADD CONSTRAINT ss_email_messages_thread_id_fkey FOREIGN KEY (thread_id) REFERENCES public.ss_email_threads(id) ON DELETE CASCADE;



ALTER TABLE ONLY public.ss_email_templates
    ADD CONSTRAINT ss_email_templates_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.ss_staff(id) ON DELETE SET NULL;



ALTER TABLE ONLY public.ss_email_threads
    ADD CONSTRAINT ss_email_threads_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.ss_staff(id) ON DELETE SET NULL;



ALTER TABLE ONLY public.ss_email_threads
    ADD CONSTRAINT ss_email_threads_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.ss_customers(id) ON DELETE SET NULL;



ALTER TABLE ONLY public.ss_internal_notes
    ADD CONSTRAINT ss_internal_notes_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.ss_customers(id) ON DELETE CASCADE;



ALTER TABLE ONLY public.ss_internal_notes
    ADD CONSTRAINT ss_internal_notes_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.ss_leads(id) ON DELETE CASCADE;



ALTER TABLE ONLY public.ss_internal_tasks
    ADD CONSTRAINT ss_internal_tasks_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.ss_customers(id) ON DELETE CASCADE;



ALTER TABLE ONLY public.ss_internal_tasks
    ADD CONSTRAINT ss_internal_tasks_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.ss_leads(id) ON DELETE CASCADE;



ALTER TABLE ONLY public.ss_invoice_reconciliation
    ADD CONSTRAINT ss_invoice_reconciliation_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.ss_invoices(id) ON DELETE CASCADE;



ALTER TABLE ONLY public.ss_lead_appointments
    ADD CONSTRAINT ss_lead_appointments_assigned_staff_id_fkey FOREIGN KEY (assigned_staff_id) REFERENCES public.ss_staff(id) ON DELETE SET NULL;



ALTER TABLE ONLY public.ss_lead_appointments
    ADD CONSTRAINT ss_lead_appointments_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.ss_customers(id) ON DELETE SET NULL;



ALTER TABLE ONLY public.ss_lead_appointments
    ADD CONSTRAINT ss_lead_appointments_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.ss_leads(id) ON DELETE CASCADE;



ALTER TABLE ONLY public.ss_native_push_tokens
    ADD CONSTRAINT ss_native_push_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;



ALTER TABLE ONLY public.ss_payment_events
    ADD CONSTRAINT ss_payment_events_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.ss_customers(id) ON DELETE CASCADE;



ALTER TABLE ONLY public.ss_payment_events
    ADD CONSTRAINT ss_payment_events_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.ss_invoices(id) ON DELETE SET NULL;



ALTER TABLE ONLY public.ss_payment_pickups
    ADD CONSTRAINT ss_payment_pickups_assigned_tech_id_fkey FOREIGN KEY (assigned_tech_id) REFERENCES public.ss_staff(id) ON DELETE SET NULL;



ALTER TABLE ONLY public.ss_payment_pickups
    ADD CONSTRAINT ss_payment_pickups_collected_by_fkey FOREIGN KEY (collected_by) REFERENCES public.ss_staff(id) ON DELETE SET NULL;



ALTER TABLE ONLY public.ss_payment_pickups
    ADD CONSTRAINT ss_payment_pickups_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.ss_customers(id) ON DELETE CASCADE;



ALTER TABLE ONLY public.ss_payment_pickups
    ADD CONSTRAINT ss_payment_pickups_visit_id_fkey FOREIGN KEY (visit_id) REFERENCES public.ss_visits(id) ON DELETE CASCADE;



ALTER TABLE ONLY public.ss_payment_proofs
    ADD CONSTRAINT ss_payment_proofs_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.ss_customers(id) ON DELETE CASCADE;



ALTER TABLE ONLY public.ss_payment_proofs
    ADD CONSTRAINT ss_payment_proofs_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.ss_invoices(id) ON DELETE CASCADE;



ALTER TABLE ONLY public.ss_pool_costs
    ADD CONSTRAINT ss_pool_costs_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.ss_customers(id) ON DELETE CASCADE;



ALTER TABLE ONLY public.ss_qr_scans
    ADD CONSTRAINT ss_qr_scans_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.ss_customers(id) ON DELETE SET NULL;



ALTER TABLE ONLY public.ss_qr_scans
    ADD CONSTRAINT ss_qr_scans_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.ss_staff(id) ON DELETE SET NULL;



ALTER TABLE ONLY public.ss_qr_scans
    ADD CONSTRAINT ss_qr_scans_visit_id_fkey FOREIGN KEY (visit_id) REFERENCES public.ss_visits(id) ON DELETE SET NULL;



ALTER TABLE ONLY public.ss_qr_tags
    ADD CONSTRAINT ss_qr_tags_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES public.ss_qr_batches(id) ON DELETE SET NULL;



ALTER TABLE ONLY public.ss_qr_tags
    ADD CONSTRAINT ss_qr_tags_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.ss_customers(id) ON DELETE SET NULL;



ALTER TABLE ONLY public.ss_qr_tags
    ADD CONSTRAINT ss_qr_tags_service_address_id_fkey FOREIGN KEY (service_address_id) REFERENCES public.ss_service_addresses(id) ON DELETE SET NULL;



ALTER TABLE ONLY public.ss_qr_tags
    ADD CONSTRAINT ss_qr_tags_water_body_id_fkey FOREIGN KEY (water_body_id) REFERENCES public.ss_water_bodies(id) ON DELETE SET NULL;



ALTER TABLE ONLY public.ss_report_events
    ADD CONSTRAINT ss_report_events_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.ss_customers(id) ON DELETE SET NULL;



ALTER TABLE ONLY public.ss_report_events
    ADD CONSTRAINT ss_report_events_visit_id_fkey FOREIGN KEY (visit_id) REFERENCES public.ss_visits(id) ON DELETE SET NULL;



ALTER TABLE ONLY public.ss_staff_availability
    ADD CONSTRAINT ss_staff_availability_tech_id_fkey FOREIGN KEY (tech_id) REFERENCES public.ss_staff(id) ON DELETE CASCADE;



ALTER TABLE ONLY public.ss_staff_time_off
    ADD CONSTRAINT ss_staff_time_off_tech_id_fkey FOREIGN KEY (tech_id) REFERENCES public.ss_staff(id) ON DELETE CASCADE;



ALTER TABLE ONLY public.ss_truck_stock
    ADD CONSTRAINT ss_truck_stock_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.ss_inventory(id) ON DELETE CASCADE;



ALTER TABLE ONLY public.ss_truck_stock
    ADD CONSTRAINT ss_truck_stock_truck_id_fkey FOREIGN KEY (truck_id) REFERENCES public.ss_trucks(id) ON DELETE CASCADE;



ALTER TABLE ONLY public.ss_vault_logins
    ADD CONSTRAINT ss_vault_logins_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.ss_vendors(id) ON DELETE SET NULL;



ALTER TABLE ONLY public.ss_visit_requests
    ADD CONSTRAINT ss_visit_requests_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.ss_customers(id) ON DELETE CASCADE;



ALTER TABLE ONLY public.ss_visit_requests
    ADD CONSTRAINT ss_visit_requests_visit_id_fkey FOREIGN KEY (visit_id) REFERENCES public.ss_visits(id) ON DELETE SET NULL;



CREATE POLICY "Anyone can read active quote templates" ON public.ss_quote_templates FOR SELECT TO anon, authenticated USING ((is_active = true));



CREATE POLICY "Crew can view qr batches" ON public.ss_qr_batches FOR SELECT TO authenticated USING (public.ss_is_staff());



CREATE POLICY "Crew can view qr tags" ON public.ss_qr_tags FOR SELECT TO authenticated USING (public.ss_is_staff());



CREATE POLICY "Crew sees their own qr scans" ON public.ss_qr_scans FOR SELECT TO authenticated USING ((staff_id = public.ss_my_staff_id()));



CREATE POLICY "Customers can view their own qr tags" ON public.ss_qr_tags FOR SELECT TO authenticated USING ((customer_id IN ( SELECT public.ss_my_customer_ids() AS ss_my_customer_ids)));



CREATE POLICY "Customers create own visit requests" ON public.ss_visit_requests FOR INSERT TO authenticated WITH CHECK (((status = 'pending'::text) AND (quoted_price IS NULL) AND (visit_id IS NULL) AND (office_note IS NULL) AND ((customer_id IN ( SELECT public.ss_my_customer_ids() AS ss_my_customer_ids)) OR public.ss_is_office())));



CREATE POLICY "Customers read own visit requests" ON public.ss_visit_requests FOR SELECT TO authenticated USING (((customer_id IN ( SELECT public.ss_my_customer_ids() AS ss_my_customer_ids)) OR public.ss_is_staff()));



CREATE POLICY "Customers view own payment events" ON public.ss_payment_events FOR SELECT TO authenticated USING ((customer_id IN ( SELECT public.ss_my_customer_ids() AS ss_my_customer_ids)));



CREATE POLICY "Office can create access codes" ON public.ss_access_codes FOR INSERT TO authenticated WITH CHECK (public.ss_is_office());



CREATE POLICY "Office can read access codes" ON public.ss_access_codes FOR SELECT TO authenticated USING (public.ss_is_office());



CREATE POLICY "Office can update access codes" ON public.ss_access_codes FOR UPDATE TO authenticated USING (public.ss_is_office()) WITH CHECK (public.ss_is_office());



CREATE POLICY "Office decides visit requests" ON public.ss_visit_requests FOR UPDATE TO authenticated USING (public.ss_is_office()) WITH CHECK (public.ss_is_office());



CREATE POLICY "Office manage sla rules" ON public.ss_sla_rules TO authenticated USING (public.ss_is_office()) WITH CHECK (public.ss_is_office());



CREATE POLICY "Office manage sla templates" ON public.ss_sla_templates TO authenticated USING (public.ss_is_office()) WITH CHECK (public.ss_is_office());



CREATE POLICY "Office manages calls" ON public.ss_calls TO authenticated USING (public.ss_is_office()) WITH CHECK (public.ss_is_office());



CREATE POLICY "Office manages payment pickups" ON public.ss_payment_pickups TO authenticated USING (public.ss_is_office()) WITH CHECK (public.ss_is_office());



CREATE POLICY "Office manages phone optouts" ON public.ss_phone_optouts TO authenticated USING (public.ss_is_office()) WITH CHECK (public.ss_is_office());



CREATE POLICY "Office manages qr batches" ON public.ss_qr_batches TO authenticated USING (public.ss_is_office()) WITH CHECK (public.ss_is_office());



CREATE POLICY "Office manages qr tags" ON public.ss_qr_tags TO authenticated USING (public.ss_is_office()) WITH CHECK (public.ss_is_office());



CREATE POLICY "Office manages truck stock" ON public.ss_truck_stock TO authenticated USING (public.ss_is_office()) WITH CHECK (public.ss_is_office());



CREATE POLICY "Office read sla alerts" ON public.ss_sla_alerts FOR SELECT TO authenticated USING (public.ss_is_office());



CREATE POLICY "Office reviews access requests" ON public.ss_access_requests FOR UPDATE TO authenticated USING (public.ss_is_office()) WITH CHECK (public.ss_is_office());



CREATE POLICY "Office reviews qr scans" ON public.ss_qr_scans FOR SELECT TO authenticated USING (public.ss_is_office());



CREATE POLICY "Office staff manage pool costs" ON public.ss_pool_costs TO authenticated USING (public.ss_is_office()) WITH CHECK (public.ss_is_office());



CREATE POLICY "Office staff manage quote templates" ON public.ss_quote_templates TO authenticated USING (public.ss_is_office()) WITH CHECK (public.ss_is_office());



CREATE POLICY "Office writes lead appointments" ON public.ss_lead_appointments TO authenticated USING (public.ss_is_staff()) WITH CHECK (public.ss_is_staff());



CREATE POLICY "Owner can delete access codes" ON public.ss_access_codes FOR DELETE TO authenticated USING (public.ss_is_owner());



CREATE POLICY "Owners manage vault logins" ON public.ss_vault_logins TO authenticated USING (public.ss_is_owner()) WITH CHECK (public.ss_is_owner());



CREATE POLICY "Service role can manage native push tokens" ON public.ss_native_push_tokens TO service_role USING (true) WITH CHECK (true);



CREATE POLICY "Signed-in users log their own report events" ON public.ss_report_events FOR INSERT TO authenticated WITH CHECK ((actor_user_id = auth.uid()));



CREATE POLICY "Staff can manage reconciliation" ON public.ss_invoice_reconciliation TO authenticated USING (public.ss_is_staff()) WITH CHECK (public.ss_is_staff());



CREATE POLICY "Staff can view backup sync state" ON public.ss_backup_sync FOR SELECT TO authenticated USING (public.ss_is_staff());



CREATE POLICY "Staff can view reconciliation" ON public.ss_invoice_reconciliation FOR SELECT TO authenticated USING (public.ss_is_staff());



CREATE POLICY "Staff manage payment events" ON public.ss_payment_events TO authenticated USING (public.ss_is_staff()) WITH CHECK (public.ss_is_staff());



CREATE POLICY "Staff read lead appointments" ON public.ss_lead_appointments FOR SELECT TO authenticated USING (public.ss_is_staff());



CREATE POLICY "Staff read report events" ON public.ss_report_events FOR SELECT TO authenticated USING (public.ss_is_staff());



CREATE POLICY "Staff read sla rules" ON public.ss_sla_rules FOR SELECT TO authenticated USING (public.ss_is_staff());



CREATE POLICY "Staff read sla templates" ON public.ss_sla_templates FOR SELECT TO authenticated USING (public.ss_is_staff());



CREATE POLICY "Staff read truck stock" ON public.ss_truck_stock FOR SELECT TO authenticated USING (public.ss_is_staff());



CREATE POLICY "Tech reads own customer calls" ON public.ss_calls FOR SELECT TO authenticated USING ((customer_id IN ( SELECT ss_customers.id
   FROM public.ss_customers
  WHERE (ss_customers.assigned_tech_id = public.ss_my_staff_id()))));



CREATE POLICY "Techs read pickups for assigned visits" ON public.ss_payment_pickups FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.ss_visits v
  WHERE ((v.id = ss_payment_pickups.visit_id) AND (v.tech_id = public.ss_my_staff_id())))));



CREATE POLICY "Techs update pickups for assigned visits" ON public.ss_payment_pickups FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.ss_visits v
  WHERE ((v.id = ss_payment_pickups.visit_id) AND (v.tech_id = public.ss_my_staff_id()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.ss_visits v
  WHERE ((v.id = ss_payment_pickups.visit_id) AND (v.tech_id = public.ss_my_staff_id())))));



CREATE POLICY "Users can manage own native push tokens" ON public.ss_native_push_tokens TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));



CREATE POLICY "Users create own access request" ON public.ss_access_requests FOR INSERT TO authenticated WITH CHECK (((user_id = auth.uid()) AND public.ss_can_claim_customer(customer_id)));



CREATE POLICY "Users create own notification prefs" ON public.ss_notification_prefs FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid()));



CREATE POLICY "Users mark own notifications read" ON public.ss_notifications FOR UPDATE TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));



CREATE POLICY "Users read own access request" ON public.ss_access_requests FOR SELECT TO authenticated USING (((user_id = auth.uid()) OR public.ss_is_office()));



CREATE POLICY "Users read own notification prefs" ON public.ss_notification_prefs FOR SELECT TO authenticated USING ((user_id = auth.uid()));



CREATE POLICY "Users read own notifications" ON public.ss_notifications FOR SELECT TO authenticated USING ((user_id = auth.uid()));



CREATE POLICY "Users update own notification prefs" ON public.ss_notification_prefs FOR UPDATE TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));



CREATE POLICY "customer opens own channel" ON public.ss_chat_channels FOR INSERT TO authenticated WITH CHECK (((kind = 'customer'::text) AND (customer_id IN ( SELECT public.ss_my_customer_ids() AS ss_my_customer_ids))));



CREATE POLICY "customer reads own messages" ON public.ss_chat_messages FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.ss_chat_channels c
  WHERE ((c.id = ss_chat_messages.channel_id) AND (c.kind = 'customer'::text) AND (c.customer_id IN ( SELECT public.ss_my_customer_ids() AS ss_my_customer_ids))))));



CREATE POLICY "customer sees own channel" ON public.ss_chat_channels FOR SELECT TO authenticated USING (((kind = 'customer'::text) AND (customer_id IN ( SELECT public.ss_my_customer_ids() AS ss_my_customer_ids))));



CREATE POLICY "customer writes own messages" ON public.ss_chat_messages FOR INSERT TO authenticated WITH CHECK (((author_kind = 'customer'::text) AND (EXISTS ( SELECT 1
   FROM public.ss_chat_channels c
  WHERE ((c.id = ss_chat_messages.channel_id) AND (c.kind = 'customer'::text) AND (c.customer_id IN ( SELECT public.ss_my_customer_ids() AS ss_my_customer_ids)))))));



CREATE POLICY "customers add own payment proofs" ON public.ss_payment_proofs FOR INSERT TO authenticated WITH CHECK ((customer_id IN ( SELECT public.ss_my_customer_ids() AS ss_my_customer_ids)));



CREATE POLICY "customers read own check payments" ON public.ss_check_payments FOR SELECT TO authenticated USING ((customer_id IN ( SELECT public.ss_my_customer_ids() AS ss_my_customer_ids)));



CREATE POLICY "customers read own payment proofs" ON public.ss_payment_proofs FOR SELECT TO authenticated USING ((customer_id IN ( SELECT public.ss_my_customer_ids() AS ss_my_customer_ids)));



CREATE POLICY "finance can read bank details" ON public.ss_bank_details FOR SELECT TO authenticated USING (public.ss_can_finance());



CREATE POLICY "finance can update bank details" ON public.ss_bank_details FOR UPDATE TO authenticated USING (public.ss_can_finance()) WITH CHECK (public.ss_can_finance());



CREATE POLICY "finance can write bank details" ON public.ss_bank_details FOR INSERT TO authenticated WITH CHECK (public.ss_can_finance());



CREATE POLICY "finance manages check payments" ON public.ss_check_payments TO authenticated USING (public.ss_can_finance()) WITH CHECK (public.ss_can_finance());



CREATE POLICY "finance reads payment proofs" ON public.ss_payment_proofs FOR SELECT TO authenticated USING (public.ss_can_finance());



CREATE POLICY "office delete internal notes" ON public.ss_internal_notes FOR DELETE TO authenticated USING (public.ss_is_office());



CREATE POLICY "office delete internal tasks" ON public.ss_internal_tasks FOR DELETE TO authenticated USING (public.ss_is_office());



CREATE POLICY "office manages crew hours" ON public.ss_staff_availability TO authenticated USING (public.ss_is_office()) WITH CHECK (public.ss_is_office());



CREATE POLICY "office manages email attachments" ON public.ss_email_attachments TO authenticated USING (public.ss_is_office()) WITH CHECK (public.ss_is_office());



CREATE POLICY "office manages email messages" ON public.ss_email_messages TO authenticated USING (public.ss_is_office()) WITH CHECK (public.ss_is_office());



CREATE POLICY "office manages email threads" ON public.ss_email_threads TO authenticated USING (public.ss_is_office()) WITH CHECK (public.ss_is_office());



CREATE POLICY "office manages time off" ON public.ss_staff_time_off TO authenticated USING (public.ss_is_office()) WITH CHECK (public.ss_is_office());



CREATE POLICY "office manages vendors" ON public.ss_vendors TO authenticated USING (public.ss_is_office()) WITH CHECK (public.ss_is_office());



CREATE POLICY "office reads attempts" ON public.ss_access_attempts FOR SELECT TO authenticated USING (public.ss_is_office());



CREATE POLICY "office reads pricing settings" ON public.ss_pricing_settings FOR SELECT TO authenticated USING (public.ss_is_office());



CREATE POLICY "office reads push subscriptions" ON public.ss_push_subscriptions FOR SELECT TO authenticated USING (public.ss_is_office());



CREATE POLICY "office update internal notes" ON public.ss_internal_notes FOR UPDATE TO authenticated USING (public.ss_is_office()) WITH CHECK (public.ss_is_office());



CREATE POLICY "own attempts readable" ON public.ss_access_attempts FOR SELECT TO authenticated USING ((user_id = auth.uid()));



CREATE POLICY "own push subscriptions" ON public.ss_push_subscriptions TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));



CREATE POLICY "owner manages pricing settings" ON public.ss_pricing_settings TO authenticated USING (public.ss_is_owner()) WITH CHECK (public.ss_is_owner());



CREATE POLICY "pickups assigned tech read" ON public.ss_payment_pickups FOR SELECT TO authenticated USING (((assigned_tech_id IS NOT NULL) AND (assigned_tech_id = public.ss_my_staff_id())));



CREATE POLICY "pickups assigned tech update" ON public.ss_payment_pickups FOR UPDATE TO authenticated USING (((assigned_tech_id IS NOT NULL) AND (assigned_tech_id = public.ss_my_staff_id()))) WITH CHECK (((assigned_tech_id IS NOT NULL) AND (assigned_tech_id = public.ss_my_staff_id())));



CREATE POLICY "pickups customer cancel own request" ON public.ss_payment_pickups FOR DELETE TO authenticated USING (((customer_id IN ( SELECT public.ss_my_customer_ids() AS ss_my_customer_ids)) AND (requested_by_customer = true) AND (status = 'requested'::text)));



CREATE POLICY "pickups customer read own" ON public.ss_payment_pickups FOR SELECT TO authenticated USING ((customer_id IN ( SELECT public.ss_my_customer_ids() AS ss_my_customer_ids)));



CREATE POLICY "pickups customer request own" ON public.ss_payment_pickups FOR INSERT TO authenticated WITH CHECK (((customer_id IN ( SELECT public.ss_my_customer_ids() AS ss_my_customer_ids)) AND (visit_id IS NULL) AND (status = 'requested'::text) AND (requested_by_customer = true) AND (scheduled_for IS NOT NULL)));



CREATE POLICY "pickups customer update own request" ON public.ss_payment_pickups FOR UPDATE TO authenticated USING (((customer_id IN ( SELECT public.ss_my_customer_ids() AS ss_my_customer_ids)) AND (requested_by_customer = true) AND (status = 'requested'::text))) WITH CHECK (((customer_id IN ( SELECT public.ss_my_customer_ids() AS ss_my_customer_ids)) AND (requested_by_customer = true) AND (status = 'requested'::text) AND (visit_id IS NULL)));



ALTER TABLE public.ss_access_attempts ENABLE ROW LEVEL SECURITY;


ALTER TABLE public.ss_access_codes ENABLE ROW LEVEL SECURITY;


ALTER TABLE public.ss_access_requests ENABLE ROW LEVEL SECURITY;


ALTER TABLE public.ss_backup_sync ENABLE ROW LEVEL SECURITY;


ALTER TABLE public.ss_bank_details ENABLE ROW LEVEL SECURITY;


ALTER TABLE public.ss_calls ENABLE ROW LEVEL SECURITY;


ALTER TABLE public.ss_catalog_sync_log ENABLE ROW LEVEL SECURITY;


ALTER TABLE public.ss_chat_channels ENABLE ROW LEVEL SECURITY;


ALTER TABLE public.ss_chat_messages ENABLE ROW LEVEL SECURITY;


ALTER TABLE public.ss_check_payments ENABLE ROW LEVEL SECURITY;


ALTER TABLE public.ss_email_attachments ENABLE ROW LEVEL SECURITY;


ALTER TABLE public.ss_email_campaign_recipients ENABLE ROW LEVEL SECURITY;


ALTER TABLE public.ss_email_campaigns ENABLE ROW LEVEL SECURITY;


ALTER TABLE public.ss_email_messages ENABLE ROW LEVEL SECURITY;


ALTER TABLE public.ss_email_templates ENABLE ROW LEVEL SECURITY;


ALTER TABLE public.ss_email_threads ENABLE ROW LEVEL SECURITY;


ALTER TABLE public.ss_internal_notes ENABLE ROW LEVEL SECURITY;


ALTER TABLE public.ss_internal_tasks ENABLE ROW LEVEL SECURITY;


ALTER TABLE public.ss_invoice_reconciliation ENABLE ROW LEVEL SECURITY;


ALTER TABLE public.ss_lead_appointments ENABLE ROW LEVEL SECURITY;


ALTER TABLE public.ss_native_push_tokens ENABLE ROW LEVEL SECURITY;


ALTER TABLE public.ss_notification_prefs ENABLE ROW LEVEL SECURITY;


ALTER TABLE public.ss_notifications ENABLE ROW LEVEL SECURITY;


ALTER TABLE public.ss_payment_events ENABLE ROW LEVEL SECURITY;


ALTER TABLE public.ss_payment_pickups ENABLE ROW LEVEL SECURITY;


ALTER TABLE public.ss_payment_proofs ENABLE ROW LEVEL SECURITY;


ALTER TABLE public.ss_phone_optouts ENABLE ROW LEVEL SECURITY;


ALTER TABLE public.ss_pool_costs ENABLE ROW LEVEL SECURITY;


ALTER TABLE public.ss_pricing_settings ENABLE ROW LEVEL SECURITY;


ALTER TABLE public.ss_push_subscriptions ENABLE ROW LEVEL SECURITY;


ALTER TABLE public.ss_qr_batches ENABLE ROW LEVEL SECURITY;


ALTER TABLE public.ss_qr_scans ENABLE ROW LEVEL SECURITY;


ALTER TABLE public.ss_qr_tags ENABLE ROW LEVEL SECURITY;


ALTER TABLE public.ss_quote_templates ENABLE ROW LEVEL SECURITY;


ALTER TABLE public.ss_report_events ENABLE ROW LEVEL SECURITY;


ALTER TABLE public.ss_sla_alerts ENABLE ROW LEVEL SECURITY;


ALTER TABLE public.ss_sla_rules ENABLE ROW LEVEL SECURITY;


ALTER TABLE public.ss_sla_templates ENABLE ROW LEVEL SECURITY;


ALTER TABLE public.ss_staff_availability ENABLE ROW LEVEL SECURITY;


ALTER TABLE public.ss_staff_time_off ENABLE ROW LEVEL SECURITY;


ALTER TABLE public.ss_task_audit ENABLE ROW LEVEL SECURITY;


ALTER TABLE public.ss_truck_stock ENABLE ROW LEVEL SECURITY;


ALTER TABLE public.ss_vault_logins ENABLE ROW LEVEL SECURITY;


ALTER TABLE public.ss_vendors ENABLE ROW LEVEL SECURITY;


ALTER TABLE public.ss_visit_requests ENABLE ROW LEVEL SECURITY;


ALTER TABLE public.ss_webhook_secret_usage ENABLE ROW LEVEL SECURITY;


CREATE POLICY "staff manage channels" ON public.ss_chat_channels TO authenticated USING (public.ss_is_staff()) WITH CHECK (public.ss_is_staff());



CREATE POLICY "staff manage email campaigns" ON public.ss_email_campaigns TO authenticated USING (public.ss_is_staff()) WITH CHECK (public.ss_is_staff());



CREATE POLICY "staff manage email recipients" ON public.ss_email_campaign_recipients TO authenticated USING (public.ss_is_staff()) WITH CHECK (public.ss_is_staff());



CREATE POLICY "staff manage email templates" ON public.ss_email_templates TO authenticated USING (public.ss_is_staff()) WITH CHECK (public.ss_is_staff());



CREATE POLICY "staff read catalog sync log" ON public.ss_catalog_sync_log FOR SELECT TO authenticated USING (public.ss_is_staff());



CREATE POLICY "staff read crew hours" ON public.ss_staff_availability FOR SELECT TO authenticated USING (public.ss_is_staff());



CREATE POLICY "staff read internal notes" ON public.ss_internal_notes FOR SELECT TO authenticated USING (public.ss_is_staff());



CREATE POLICY "staff read internal tasks" ON public.ss_internal_tasks FOR SELECT TO authenticated USING (public.ss_is_staff());



CREATE POLICY "staff read messages" ON public.ss_chat_messages FOR SELECT TO authenticated USING (public.ss_is_staff());



CREATE POLICY "staff read task audit" ON public.ss_task_audit FOR SELECT TO authenticated USING (public.ss_is_staff());



CREATE POLICY "staff read time off" ON public.ss_staff_time_off FOR SELECT TO authenticated USING (public.ss_is_staff());



CREATE POLICY "staff read vendors" ON public.ss_vendors FOR SELECT TO authenticated USING (public.ss_is_staff());



CREATE POLICY "staff read webhook secret usage" ON public.ss_webhook_secret_usage FOR SELECT TO authenticated USING (public.ss_is_staff());



CREATE POLICY "staff update internal tasks" ON public.ss_internal_tasks FOR UPDATE TO authenticated USING (public.ss_is_staff()) WITH CHECK (public.ss_is_staff());



CREATE POLICY "staff write catalog sync log" ON public.ss_catalog_sync_log FOR INSERT TO authenticated WITH CHECK (public.ss_is_staff());



CREATE POLICY "staff write internal notes" ON public.ss_internal_notes FOR INSERT TO authenticated WITH CHECK ((public.ss_is_staff() AND ((lead_id IS NOT NULL) OR (customer_id IS NOT NULL)) AND ((length(body) >= 1) AND (length(body) <= 5000))));



CREATE POLICY "staff write internal tasks" ON public.ss_internal_tasks FOR INSERT TO authenticated WITH CHECK ((public.ss_is_staff() AND ((lead_id IS NOT NULL) OR (customer_id IS NOT NULL)) AND ((length(title) >= 1) AND (length(title) <= 300))));



CREATE POLICY "staff write messages" ON public.ss_chat_messages FOR INSERT TO authenticated WITH CHECK (public.ss_is_staff());



CREATE POLICY "staff write task audit" ON public.ss_task_audit FOR INSERT TO authenticated WITH CHECK ((public.ss_is_staff() AND ((actor_id IS NULL) OR (actor_id = auth.uid()))));



GRANT SELECT ON TABLE public.ss_access_attempts TO authenticated;
GRANT ALL ON TABLE public.ss_access_attempts TO service_role;



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.ss_access_codes TO authenticated;
GRANT ALL ON TABLE public.ss_access_codes TO service_role;



GRANT SELECT,INSERT,UPDATE ON TABLE public.ss_access_requests TO authenticated;
GRANT ALL ON TABLE public.ss_access_requests TO service_role;



GRANT SELECT ON TABLE public.ss_backup_sync TO authenticated;
GRANT ALL ON TABLE public.ss_backup_sync TO service_role;



GRANT SELECT,INSERT,UPDATE ON TABLE public.ss_bank_details TO authenticated;
GRANT ALL ON TABLE public.ss_bank_details TO service_role;



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.ss_calls TO authenticated;
GRANT ALL ON TABLE public.ss_calls TO service_role;



GRANT SELECT,INSERT ON TABLE public.ss_catalog_sync_log TO authenticated;
GRANT ALL ON TABLE public.ss_catalog_sync_log TO service_role;



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.ss_chat_channels TO authenticated;
GRANT ALL ON TABLE public.ss_chat_channels TO service_role;



GRANT SELECT,INSERT ON TABLE public.ss_chat_messages TO authenticated;
GRANT ALL ON TABLE public.ss_chat_messages TO service_role;



GRANT SELECT,INSERT,UPDATE ON TABLE public.ss_check_payments TO authenticated;
GRANT ALL ON TABLE public.ss_check_payments TO service_role;



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.ss_email_attachments TO authenticated;
GRANT ALL ON TABLE public.ss_email_attachments TO service_role;



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.ss_email_campaign_recipients TO authenticated;
GRANT ALL ON TABLE public.ss_email_campaign_recipients TO service_role;



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.ss_email_campaigns TO authenticated;
GRANT ALL ON TABLE public.ss_email_campaigns TO service_role;



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.ss_email_messages TO authenticated;
GRANT ALL ON TABLE public.ss_email_messages TO service_role;



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.ss_email_templates TO authenticated;
GRANT ALL ON TABLE public.ss_email_templates TO service_role;



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.ss_email_threads TO authenticated;
GRANT ALL ON TABLE public.ss_email_threads TO service_role;



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.ss_internal_notes TO authenticated;
GRANT ALL ON TABLE public.ss_internal_notes TO service_role;



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.ss_internal_tasks TO authenticated;
GRANT ALL ON TABLE public.ss_internal_tasks TO service_role;



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.ss_invoice_reconciliation TO authenticated;
GRANT ALL ON TABLE public.ss_invoice_reconciliation TO service_role;



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.ss_lead_appointments TO authenticated;
GRANT ALL ON TABLE public.ss_lead_appointments TO service_role;



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.ss_native_push_tokens TO authenticated;
GRANT ALL ON TABLE public.ss_native_push_tokens TO service_role;



GRANT SELECT,INSERT,UPDATE ON TABLE public.ss_notification_prefs TO authenticated;
GRANT ALL ON TABLE public.ss_notification_prefs TO service_role;



GRANT SELECT,UPDATE ON TABLE public.ss_notifications TO authenticated;
GRANT ALL ON TABLE public.ss_notifications TO service_role;



GRANT SELECT,INSERT ON TABLE public.ss_payment_events TO authenticated;
GRANT ALL ON TABLE public.ss_payment_events TO service_role;



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.ss_payment_pickups TO authenticated;
GRANT ALL ON TABLE public.ss_payment_pickups TO service_role;



GRANT SELECT,INSERT ON TABLE public.ss_payment_proofs TO authenticated;
GRANT ALL ON TABLE public.ss_payment_proofs TO service_role;



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.ss_phone_optouts TO authenticated;
GRANT ALL ON TABLE public.ss_phone_optouts TO service_role;



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.ss_pool_costs TO authenticated;
GRANT ALL ON TABLE public.ss_pool_costs TO service_role;



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.ss_pricing_settings TO authenticated;
GRANT ALL ON TABLE public.ss_pricing_settings TO service_role;



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.ss_push_subscriptions TO authenticated;
GRANT ALL ON TABLE public.ss_push_subscriptions TO service_role;



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.ss_qr_batches TO authenticated;
GRANT ALL ON TABLE public.ss_qr_batches TO service_role;



GRANT SELECT ON TABLE public.ss_qr_scans TO authenticated;
GRANT ALL ON TABLE public.ss_qr_scans TO service_role;



GRANT SELECT ON TABLE public.ss_qr_tags TO authenticated;
GRANT ALL ON TABLE public.ss_qr_tags TO service_role;



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.ss_quote_templates TO authenticated;
GRANT SELECT ON TABLE public.ss_quote_templates TO anon;
GRANT ALL ON TABLE public.ss_quote_templates TO service_role;



GRANT SELECT,INSERT ON TABLE public.ss_report_events TO authenticated;
GRANT ALL ON TABLE public.ss_report_events TO service_role;



GRANT SELECT ON TABLE public.ss_sla_alerts TO authenticated;
GRANT ALL ON TABLE public.ss_sla_alerts TO service_role;



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.ss_sla_rules TO authenticated;
GRANT ALL ON TABLE public.ss_sla_rules TO service_role;



GRANT SELECT,INSERT,UPDATE ON TABLE public.ss_sla_templates TO authenticated;
GRANT ALL ON TABLE public.ss_sla_templates TO service_role;



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.ss_staff_availability TO authenticated;
GRANT ALL ON TABLE public.ss_staff_availability TO service_role;



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.ss_staff_time_off TO authenticated;
GRANT ALL ON TABLE public.ss_staff_time_off TO service_role;



GRANT SELECT,INSERT ON TABLE public.ss_task_audit TO authenticated;
GRANT ALL ON TABLE public.ss_task_audit TO service_role;



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.ss_truck_stock TO authenticated;
GRANT ALL ON TABLE public.ss_truck_stock TO service_role;



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.ss_vault_logins TO authenticated;
GRANT ALL ON TABLE public.ss_vault_logins TO service_role;



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.ss_vendors TO authenticated;
GRANT ALL ON TABLE public.ss_vendors TO service_role;



GRANT SELECT,INSERT,UPDATE ON TABLE public.ss_visit_requests TO authenticated;
GRANT ALL ON TABLE public.ss_visit_requests TO service_role;



GRANT SELECT ON TABLE public.ss_webhook_secret_usage TO authenticated;
GRANT ALL ON TABLE public.ss_webhook_secret_usage TO service_role;



\unrestrict VDNfqZokZMgXWvc4yb8V7ivzeQSaaxuXc5dJUaSSCpn75xsntCQRA1Ganlr6yZQ

-- New columns on shared tables
ALTER TABLE public.inspection_requests ADD COLUMN IF NOT EXISTS assigned_staff_id uuid;
ALTER TABLE public.inspection_requests ADD COLUMN IF NOT EXISTS customer_note text;
ALTER TABLE public.inspection_requests ADD COLUMN IF NOT EXISTS eta_at timestamp with time zone;
ALTER TABLE public.inspection_requests ADD COLUMN IF NOT EXISTS eta_window text;
ALTER TABLE public.inspection_requests ADD COLUMN IF NOT EXISTS status_changed_at timestamp with time zone;
ALTER TABLE public.ss_city_rates ADD COLUMN IF NOT EXISTS rate_basis text DEFAULT 'monthly'::text;
ALTER TABLE public.ss_contract_templates ADD COLUMN IF NOT EXISTS key text;
ALTER TABLE public.ss_customers ADD COLUMN IF NOT EXISTS attribution jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.ss_customers ADD COLUMN IF NOT EXISTS attribution_campaign text;
ALTER TABLE public.ss_customers ADD COLUMN IF NOT EXISTS attribution_landing_page text;
ALTER TABLE public.ss_customers ADD COLUMN IF NOT EXISTS became_customer_at timestamp with time zone;
ALTER TABLE public.ss_customers ADD COLUMN IF NOT EXISTS billing_anchor_date date;
ALTER TABLE public.ss_customers ADD COLUMN IF NOT EXISTS card_brand text;
ALTER TABLE public.ss_customers ADD COLUMN IF NOT EXISTS card_last4 text;
ALTER TABLE public.ss_customers ADD COLUMN IF NOT EXISTS filter_baseline_psi numeric;
ALTER TABLE public.ss_customers ADD COLUMN IF NOT EXISTS filter_clean_billing text DEFAULT 'monthly'::text;
ALTER TABLE public.ss_customers ADD COLUMN IF NOT EXISTS filter_clean_charge_type text DEFAULT 'none'::text;
ALTER TABLE public.ss_customers ADD COLUMN IF NOT EXISTS filter_clean_included boolean DEFAULT false;
ALTER TABLE public.ss_customers ADD COLUMN IF NOT EXISTS filter_clean_price numeric(10,2) DEFAULT 35.00;
ALTER TABLE public.ss_customers ADD COLUMN IF NOT EXISTS filter_identified_at timestamp with time zone;
ALTER TABLE public.ss_customers ADD COLUMN IF NOT EXISTS filter_label_note text;
ALTER TABLE public.ss_customers ADD COLUMN IF NOT EXISTS filter_label_photo_url text;
ALTER TABLE public.ss_customers ADD COLUMN IF NOT EXISTS filter_psi_threshold numeric DEFAULT 19;
ALTER TABLE public.ss_customers ADD COLUMN IF NOT EXISTS filter_type text;
ALTER TABLE public.ss_customers ADD COLUMN IF NOT EXISTS first_month_charge_amount numeric;
ALTER TABLE public.ss_customers ADD COLUMN IF NOT EXISTS first_month_charge_status text DEFAULT 'none'::text;
ALTER TABLE public.ss_customers ADD COLUMN IF NOT EXISTS first_month_charged_at timestamp with time zone;
ALTER TABLE public.ss_customers ADD COLUMN IF NOT EXISTS first_touch_at timestamp with time zone;
ALTER TABLE public.ss_customers ADD COLUMN IF NOT EXISTS first_touch_placement text;
ALTER TABLE public.ss_customers ADD COLUMN IF NOT EXISTS gate_code_updated_at timestamp with time zone;
ALTER TABLE public.ss_customers ADD COLUMN IF NOT EXISTS gate_code_updated_by uuid;
ALTER TABLE public.ss_customers ADD COLUMN IF NOT EXISTS gate_code_updated_by_name text;
ALTER TABLE public.ss_customers ADD COLUMN IF NOT EXISTS gate_code_updated_by_role text;
ALTER TABLE public.ss_customers ADD COLUMN IF NOT EXISTS house_photo_path text;
ALTER TABLE public.ss_customers ADD COLUMN IF NOT EXISTS last_backwash_at date;
ALTER TABLE public.ss_customers ADD COLUMN IF NOT EXISTS last_cartridge_clean_at date;
ALTER TABLE public.ss_customers ADD COLUMN IF NOT EXISTS last_salt_cell_clean_at date;
ALTER TABLE public.ss_customers ADD COLUMN IF NOT EXISTS last_touch_at timestamp with time zone;
ALTER TABLE public.ss_customers ADD COLUMN IF NOT EXISTS last_touch_placement text;
ALTER TABLE public.ss_customers ADD COLUMN IF NOT EXISTS needs_review boolean DEFAULT false;
ALTER TABLE public.ss_customers ADD COLUMN IF NOT EXISTS plan_id text;
ALTER TABLE public.ss_customers ADD COLUMN IF NOT EXISTS pool_number text DEFAULT ss_next_pool_number();
ALTER TABLE public.ss_customers ADD COLUMN IF NOT EXISTS pool_photo_path text;
ALTER TABLE public.ss_customers ADD COLUMN IF NOT EXISTS pool_size_band text;
ALTER TABLE public.ss_customers ADD COLUMN IF NOT EXISTS price_confirmed_at timestamp with time zone;
ALTER TABLE public.ss_customers ADD COLUMN IF NOT EXISTS price_confirmed_by text;
ALTER TABLE public.ss_customers ADD COLUMN IF NOT EXISTS qr_tag_id text;
ALTER TABLE public.ss_customers ADD COLUMN IF NOT EXISTS reviewed_at timestamp with time zone;
ALTER TABLE public.ss_customers ADD COLUMN IF NOT EXISTS reviewed_by uuid;
ALTER TABLE public.ss_customers ADD COLUMN IF NOT EXISTS salt_cell_billing text DEFAULT 'monthly'::text;
ALTER TABLE public.ss_customers ADD COLUMN IF NOT EXISTS salt_cell_charge_type text DEFAULT 'none'::text;
ALTER TABLE public.ss_customers ADD COLUMN IF NOT EXISTS salt_cell_included boolean DEFAULT false;
ALTER TABLE public.ss_customers ADD COLUMN IF NOT EXISTS salt_cell_interval_days integer DEFAULT 120;
ALTER TABLE public.ss_customers ADD COLUMN IF NOT EXISTS salt_cell_price numeric(10,2) DEFAULT 15.00;
ALTER TABLE public.ss_customers ADD COLUMN IF NOT EXISTS salt_cell_quantity integer DEFAULT 1;
ALTER TABLE public.ss_customers ADD COLUMN IF NOT EXISTS sanitizer text DEFAULT 'chlorine'::text;
ALTER TABLE public.ss_customers ADD COLUMN IF NOT EXISTS service_hold_at timestamp with time zone;
ALTER TABLE public.ss_customers ADD COLUMN IF NOT EXISTS service_hold_reason text;
ALTER TABLE public.ss_customers ADD COLUMN IF NOT EXISTS signup_source text;
ALTER TABLE public.ss_customers ADD COLUMN IF NOT EXISTS stripe_customer_id text;
ALTER TABLE public.ss_customers ADD COLUMN IF NOT EXISTS stripe_payment_method_id text;
ALTER TABLE public.ss_customers ADD COLUMN IF NOT EXISTS waterfall_override jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.ss_inventory ADD COLUMN IF NOT EXISTS reorder_qty numeric;
ALTER TABLE public.ss_inventory ADD COLUMN IF NOT EXISTS vendor_id uuid;
ALTER TABLE public.ss_inventory_moves ADD COLUMN IF NOT EXISTS truck_id uuid;
ALTER TABLE public.ss_invoice_items ADD COLUMN IF NOT EXISTS internal_only boolean DEFAULT false;
ALTER TABLE public.ss_invoices ADD COLUMN IF NOT EXISTS currency text DEFAULT 'usd'::text;
ALTER TABLE public.ss_invoices ADD COLUMN IF NOT EXISTS hold_at timestamp with time zone;
ALTER TABLE public.ss_invoices ADD COLUMN IF NOT EXISTS past_due_at timestamp with time zone;
ALTER TABLE public.ss_invoices ADD COLUMN IF NOT EXISTS period_month date;
ALTER TABLE public.ss_invoices ADD COLUMN IF NOT EXISTS reminder_sent_at timestamp with time zone;
ALTER TABLE public.ss_jobs ADD COLUMN IF NOT EXISTS ended_at timestamp with time zone;
ALTER TABLE public.ss_jobs ADD COLUMN IF NOT EXISTS started_at timestamp with time zone;
ALTER TABLE public.ss_leads ADD COLUMN IF NOT EXISTS assigned_at timestamp with time zone;
ALTER TABLE public.ss_leads ADD COLUMN IF NOT EXISTS assigned_staff_id uuid;
ALTER TABLE public.ss_leads ADD COLUMN IF NOT EXISTS campaign_id text;
ALTER TABLE public.ss_leads ADD COLUMN IF NOT EXISTS channel text DEFAULT 'website'::text;
ALTER TABLE public.ss_leads ADD COLUMN IF NOT EXISTS cta text;
ALTER TABLE public.ss_leads ADD COLUMN IF NOT EXISTS first_response_at timestamp with time zone;
ALTER TABLE public.ss_leads ADD COLUMN IF NOT EXISTS intake_channel text;
ALTER TABLE public.ss_leads ADD COLUMN IF NOT EXISTS intake_ref uuid;
ALTER TABLE public.ss_leads ADD COLUMN IF NOT EXISTS landing_page text;
ALTER TABLE public.ss_leads ADD COLUMN IF NOT EXISTS last_reminder_at timestamp with time zone;
ALTER TABLE public.ss_leads ADD COLUMN IF NOT EXISTS next_action text;
ALTER TABLE public.ss_leads ADD COLUMN IF NOT EXISTS next_action_due timestamp with time zone;
ALTER TABLE public.ss_leads ADD COLUMN IF NOT EXISTS next_action_owner_id uuid;
ALTER TABLE public.ss_leads ADD COLUMN IF NOT EXISTS next_action_set_at timestamp with time zone;
ALTER TABLE public.ss_leads ADD COLUMN IF NOT EXISTS opt_in_at timestamp with time zone;
ALTER TABLE public.ss_leads ADD COLUMN IF NOT EXISTS placement text;
ALTER TABLE public.ss_leads ADD COLUMN IF NOT EXISTS referrer text;
ALTER TABLE public.ss_leads ADD COLUMN IF NOT EXISTS reminder_count integer DEFAULT 0;
ALTER TABLE public.ss_leads ADD COLUMN IF NOT EXISTS session_id text;
ALTER TABLE public.ss_leads ADD COLUMN IF NOT EXISTS sla_due_at timestamp with time zone;
ALTER TABLE public.ss_leads ADD COLUMN IF NOT EXISTS sla_status text DEFAULT 'on_track'::text;
ALTER TABLE public.ss_leads ADD COLUMN IF NOT EXISTS sms_opt_in boolean DEFAULT false;
ALTER TABLE public.ss_leads ADD COLUMN IF NOT EXISTS utm jsonb;
ALTER TABLE public.ss_payments ADD COLUMN IF NOT EXISTS confirmed_at timestamp with time zone;
ALTER TABLE public.ss_payments ADD COLUMN IF NOT EXISTS confirmed_by uuid;
ALTER TABLE public.ss_price_book ADD COLUMN IF NOT EXISTS addon_key text;
ALTER TABLE public.ss_price_book ADD COLUMN IF NOT EXISTS default_cost numeric(10,2) DEFAULT 0;
ALTER TABLE public.ss_price_book ADD COLUMN IF NOT EXISTS kind text DEFAULT 'one_time'::text;
ALTER TABLE public.ss_price_book ADD COLUMN IF NOT EXISTS price_max numeric;
ALTER TABLE public.ss_price_book ADD COLUMN IF NOT EXISTS target_margin_pct numeric(5,2);
ALTER TABLE public.ss_quote_items ADD COLUMN IF NOT EXISTS bundle_id uuid;
ALTER TABLE public.ss_quote_items ADD COLUMN IF NOT EXISTS bundle_includes jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.ss_quote_items ADD COLUMN IF NOT EXISTS bundle_name text;
ALTER TABLE public.ss_quote_items ADD COLUMN IF NOT EXISTS choice_group text;
ALTER TABLE public.ss_quote_items ADD COLUMN IF NOT EXISTS choice_required boolean DEFAULT false;
ALTER TABLE public.ss_quote_items ADD COLUMN IF NOT EXISTS itemized_unit_price numeric;
ALTER TABLE public.ss_route_schedules ADD COLUMN IF NOT EXISTS window_end time without time zone;
ALTER TABLE public.ss_route_schedules ADD COLUMN IF NOT EXISTS window_start time without time zone;
ALTER TABLE public.ss_staff ADD COLUMN IF NOT EXISTS finance_access boolean DEFAULT false;
ALTER TABLE public.ss_staff ADD COLUMN IF NOT EXISTS hourly_rate numeric;
ALTER TABLE public.ss_visits ADD COLUMN IF NOT EXISTS amount_paid numeric(10,2) DEFAULT 0;
ALTER TABLE public.ss_visits ADD COLUMN IF NOT EXISTS backwash_done boolean DEFAULT false;
ALTER TABLE public.ss_visits ADD COLUMN IF NOT EXISTS cartridge_cleaned boolean DEFAULT false;
ALTER TABLE public.ss_visits ADD COLUMN IF NOT EXISTS checkin_lat numeric;
ALTER TABLE public.ss_visits ADD COLUMN IF NOT EXISTS checkin_lng numeric;
ALTER TABLE public.ss_visits ADD COLUMN IF NOT EXISTS checkin_source text;
ALTER TABLE public.ss_visits ADD COLUMN IF NOT EXISTS cost_items jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.ss_visits ADD COLUMN IF NOT EXISTS cost_total numeric DEFAULT 0;
ALTER TABLE public.ss_visits ADD COLUMN IF NOT EXISTS customer_notified_at timestamp with time zone;
ALTER TABLE public.ss_visits ADD COLUMN IF NOT EXISTS filter_label_photo_url text;
ALTER TABLE public.ss_visits ADD COLUMN IF NOT EXISTS filter_psi_after numeric;
ALTER TABLE public.ss_visits ADD COLUMN IF NOT EXISTS filter_psi_before numeric;
ALTER TABLE public.ss_visits ADD COLUMN IF NOT EXISTS filter_type text;
ALTER TABLE public.ss_visits ADD COLUMN IF NOT EXISTS hold_manual boolean DEFAULT false;
ALTER TABLE public.ss_visits ADD COLUMN IF NOT EXISTS invoice_id uuid;
ALTER TABLE public.ss_visits ADD COLUMN IF NOT EXISTS labor_cost numeric DEFAULT 0;
ALTER TABLE public.ss_visits ADD COLUMN IF NOT EXISTS labor_hours numeric;
ALTER TABLE public.ss_visits ADD COLUMN IF NOT EXISTS late_fee numeric(10,2) DEFAULT 0;
ALTER TABLE public.ss_visits ADD COLUMN IF NOT EXISTS late_fee_applied_at timestamp with time zone;
ALTER TABLE public.ss_visits ADD COLUMN IF NOT EXISTS paid_at timestamp with time zone;
ALTER TABLE public.ss_visits ADD COLUMN IF NOT EXISTS parts_cost numeric DEFAULT 0;
ALTER TABLE public.ss_visits ADD COLUMN IF NOT EXISTS payment_method text;
ALTER TABLE public.ss_visits ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'unpaid'::text;
ALTER TABLE public.ss_visits ADD COLUMN IF NOT EXISTS report_sent_at timestamp with time zone;
ALTER TABLE public.ss_visits ADD COLUMN IF NOT EXISTS report_url text;
ALTER TABLE public.ss_visits ADD COLUMN IF NOT EXISTS safety_checks jsonb;
ALTER TABLE public.ss_visits ADD COLUMN IF NOT EXISTS safety_hazards text;
ALTER TABLE public.ss_visits ADD COLUMN IF NOT EXISTS safety_ok boolean;
ALTER TABLE public.ss_visits ADD COLUMN IF NOT EXISTS safety_photos jsonb;
ALTER TABLE public.ss_visits ADD COLUMN IF NOT EXISTS safety_sent_at timestamp with time zone;
ALTER TABLE public.ss_visits ADD COLUMN IF NOT EXISTS service_amount numeric(10,2) DEFAULT 0;
ALTER TABLE public.ss_visits ADD COLUMN IF NOT EXISTS service_day text;
ALTER TABLE public.ss_visits ADD COLUMN IF NOT EXISTS signature_name text;
ALTER TABLE public.ss_visits ADD COLUMN IF NOT EXISTS signature_url text;
ALTER TABLE public.ss_visits ADD COLUMN IF NOT EXISTS signed_at timestamp with time zone;
ALTER TABLE public.ss_visits ADD COLUMN IF NOT EXISTS signed_by text;
ALTER TABLE public.ss_visits ADD COLUMN IF NOT EXISTS summary_emailed_at timestamp with time zone;
ALTER TABLE public.ss_visits ADD COLUMN IF NOT EXISTS swim_hold_reason text;
ALTER TABLE public.ss_visits ADD COLUMN IF NOT EXISTS swim_ready_notified_at timestamp with time zone;
ALTER TABLE public.ss_visits ADD COLUMN IF NOT EXISTS swim_safe_at timestamp with time zone;
ALTER TABLE public.ss_visits ADD COLUMN IF NOT EXISTS visit_kind text DEFAULT 'service'::text;
ALTER TABLE public.ss_visits ADD COLUMN IF NOT EXISTS window_end time without time zone;
ALTER TABLE public.ss_visits ADD COLUMN IF NOT EXISTS window_start time without time zone;
ALTER TABLE public.ss_visits ADD COLUMN IF NOT EXISTS work_performed text;
ALTER TABLE public.ss_water_bodies ADD COLUMN IF NOT EXISTS access_notes text;
ALTER TABLE public.ss_water_bodies ADD COLUMN IF NOT EXISTS automation_brand text;
ALTER TABLE public.ss_water_bodies ADD COLUMN IF NOT EXISTS avg_depth_ft numeric;
ALTER TABLE public.ss_water_bodies ADD COLUMN IF NOT EXISTS cleaner_brand text;
ALTER TABLE public.ss_water_bodies ADD COLUMN IF NOT EXISTS cleaner_type text;
ALTER TABLE public.ss_water_bodies ADD COLUMN IF NOT EXISTS features text[] DEFAULT '{}'::text[];
ALTER TABLE public.ss_water_bodies ADD COLUMN IF NOT EXISTS filter_baseline_psi numeric;
ALTER TABLE public.ss_water_bodies ADD COLUMN IF NOT EXISTS filter_identified_at timestamp with time zone;
ALTER TABLE public.ss_water_bodies ADD COLUMN IF NOT EXISTS filter_label_photo_url text;
ALTER TABLE public.ss_water_bodies ADD COLUMN IF NOT EXISTS filter_psi_threshold numeric DEFAULT 19;
ALTER TABLE public.ss_water_bodies ADD COLUMN IF NOT EXISTS filter_type text;
ALTER TABLE public.ss_water_bodies ADD COLUMN IF NOT EXISTS gate_code text;
ALTER TABLE public.ss_water_bodies ADD COLUMN IF NOT EXISTS gate_location text;
ALTER TABLE public.ss_water_bodies ADD COLUMN IF NOT EXISTS has_dog boolean;
ALTER TABLE public.ss_water_bodies ADD COLUMN IF NOT EXISTS heater_brand text;
ALTER TABLE public.ss_water_bodies ADD COLUMN IF NOT EXISTS heater_model text;
ALTER TABLE public.ss_water_bodies ADD COLUMN IF NOT EXISTS heater_type text;
ALTER TABLE public.ss_water_bodies ADD COLUMN IF NOT EXISTS last_backwash_at date;
ALTER TABLE public.ss_water_bodies ADD COLUMN IF NOT EXISTS last_cartridge_clean_at date;
ALTER TABLE public.ss_water_bodies ADD COLUMN IF NOT EXISTS length_ft numeric;
ALTER TABLE public.ss_water_bodies ADD COLUMN IF NOT EXISTS profile_captured_at timestamp with time zone;
ALTER TABLE public.ss_water_bodies ADD COLUMN IF NOT EXISTS profile_captured_by uuid;
ALTER TABLE public.ss_water_bodies ADD COLUMN IF NOT EXISTS profile_photos jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.ss_water_bodies ADD COLUMN IF NOT EXISTS pump_brand text;
ALTER TABLE public.ss_water_bodies ADD COLUMN IF NOT EXISTS pump_hp text;
ALTER TABLE public.ss_water_bodies ADD COLUMN IF NOT EXISTS pump_model text;
ALTER TABLE public.ss_water_bodies ADD COLUMN IF NOT EXISTS pump_variable_speed boolean;
ALTER TABLE public.ss_water_bodies ADD COLUMN IF NOT EXISTS salt_cell_brand text;
ALTER TABLE public.ss_water_bodies ADD COLUMN IF NOT EXISTS salt_cell_model text;
ALTER TABLE public.ss_water_bodies ADD COLUMN IF NOT EXISTS width_ft numeric;
