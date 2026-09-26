SET check_function_bodies = off;
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