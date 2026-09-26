SET check_function_bodies = off;
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