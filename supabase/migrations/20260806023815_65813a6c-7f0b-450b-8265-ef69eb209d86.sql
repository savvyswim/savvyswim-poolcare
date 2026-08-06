ALTER TABLE public.ss_visits
  ADD COLUMN IF NOT EXISTS is_locked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS rain_hold boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.ss_set_visit_flag(
  p_customer_id uuid,
  p_flag text,
  p_value boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  c public.ss_customers%ROWTYPE;
  v public.ss_visits%ROWTYPE;
BEGIN
  IF p_flag NOT IN ('lock', 'rain') THEN
    RAISE EXCEPTION 'Unknown flag';
  END IF;

  SELECT * INTO c FROM public.ss_customers
    WHERE id = p_customer_id AND user_id = auth.uid();
  IF c.id IS NULL THEN
    RAISE EXCEPTION 'Pool not found for this account';
  END IF;

  SELECT * INTO v FROM public.ss_visits
    WHERE customer_id = c.id
      AND status <> 'completed'
      AND scheduled_date >= current_date
    ORDER BY scheduled_date ASC
    LIMIT 1;

  IF v.id IS NULL THEN
    RAISE EXCEPTION 'No upcoming visit to update';
  END IF;

  IF p_flag = 'lock' THEN
    UPDATE public.ss_visits SET is_locked = coalesce(p_value, false)
      WHERE id = v.id RETURNING * INTO v;
  ELSE
    UPDATE public.ss_visits SET rain_hold = coalesce(p_value, false)
      WHERE id = v.id RETURNING * INTO v;
  END IF;

  INSERT INTO public.ss_feed (customer_id, kind, title, body, visit_id)
  VALUES (
    c.id,
    CASE WHEN p_flag = 'lock' THEN 'lock' ELSE 'rain' END,
    CASE
      WHEN p_flag = 'lock' AND v.is_locked THEN 'Visit locked for ' || to_char(v.scheduled_date, 'Mon FMDD')
      WHEN p_flag = 'lock' THEN 'Visit unlocked for ' || to_char(v.scheduled_date, 'Mon FMDD')
      WHEN v.rain_hold THEN 'Rain day flagged for ' || to_char(v.scheduled_date, 'Mon FMDD')
      ELSE 'Rain day cleared for ' || to_char(v.scheduled_date, 'Mon FMDD')
    END,
    'Set from the customer portal.',
    v.id
  );

  INSERT INTO public.ss_alerts (customer_id, tech_id, priority, title, body)
  VALUES (
    c.id,
    c.assigned_tech_id,
    CASE WHEN p_flag = 'rain' AND v.rain_hold THEN 'high' ELSE 'normal' END,
    CASE WHEN p_flag = 'lock' THEN 'Visit lock updated — ' ELSE 'Rain day updated — ' END || c.full_name,
    coalesce(c.address, '') || ' · ' || to_char(v.scheduled_date, 'Mon FMDD, YYYY')
      || ' · locked=' || v.is_locked::text || ' rain=' || v.rain_hold::text
  );

  RETURN jsonb_build_object(
    'visit_id', v.id,
    'scheduled_date', v.scheduled_date,
    'is_locked', v.is_locked,
    'rain_hold', v.rain_hold
  );
END;
$$;

REVOKE ALL ON FUNCTION public.ss_set_visit_flag(uuid, text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ss_set_visit_flag(uuid, text, boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.ss_request_visit_reschedule(
  p_customer_id uuid,
  p_date date,
  p_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  c public.ss_customers%ROWTYPE;
  v public.ss_visits%ROWTYPE;
  v_note text := nullif(btrim(left(coalesce(p_note, ''), 500)), '');
  v_created boolean := false;
BEGIN
  SELECT * INTO c FROM public.ss_customers
    WHERE id = p_customer_id AND user_id = auth.uid();
  IF c.id IS NULL THEN
    RAISE EXCEPTION 'Pool not found for this account';
  END IF;

  IF p_date IS NULL OR p_date < current_date THEN
    RAISE EXCEPTION 'Pick a future date';
  END IF;
  IF p_date > current_date + 120 THEN
    RAISE EXCEPTION 'Pick a date within the next 120 days';
  END IF;

  SELECT * INTO v FROM public.ss_visits
    WHERE customer_id = c.id
      AND status <> 'completed'
      AND scheduled_date >= current_date
    ORDER BY scheduled_date ASC
    LIMIT 1;

  IF v.id IS NOT NULL AND v.is_locked THEN
    RAISE EXCEPTION 'This visit is locked — unlock it first';
  END IF;

  IF v.id IS NULL THEN
    INSERT INTO public.ss_visits (customer_id, tech_id, scheduled_date, status)
    VALUES (c.id, c.assigned_tech_id, p_date, 'scheduled')
    RETURNING * INTO v;
    v_created := true;
  ELSE
    UPDATE public.ss_visits
      SET scheduled_date = p_date, status = 'scheduled'
      WHERE id = v.id
      RETURNING * INTO v;
  END IF;

  INSERT INTO public.ss_feed (customer_id, kind, title, body, visit_id)
  VALUES (
    c.id,
    'reschedule',
    CASE WHEN v_created THEN 'Visit requested for ' ELSE 'Visit moved to ' END || to_char(p_date, 'Mon FMDD, YYYY'),
    coalesce(v_note, 'Requested from the customer portal.'),
    v.id
  );

  INSERT INTO public.ss_alerts (customer_id, tech_id, priority, title, body)
  VALUES (
    c.id,
    c.assigned_tech_id,
    'normal',
    'Reschedule request — ' || c.full_name,
    coalesce(c.address, '') || ' · new date ' || to_char(p_date, 'Mon FMDD, YYYY')
      || coalesce(' · ' || v_note, '')
  );

  RETURN jsonb_build_object(
    'visit_id', v.id,
    'scheduled_date', p_date,
    'created', v_created,
    'customer_name', c.full_name,
    'email', c.email,
    'phone', c.phone,
    'address', c.address,
    'service_level', c.service_level,
    'route_day', c.route_day
  );
END;
$$;