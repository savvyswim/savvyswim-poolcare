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