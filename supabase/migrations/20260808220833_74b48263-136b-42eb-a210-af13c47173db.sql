CREATE OR REPLACE FUNCTION public.ss_log_inventory_usage(p_items jsonb, p_visit_id uuid DEFAULT NULL::uuid, p_job_id uuid DEFAULT NULL::uuid, p_note text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  it jsonb;
  inv public.ss_inventory%ROWTYPE;
  v_qty numeric;
  v_entered numeric;
  v_unit text;
  v_customer uuid;
  v_after numeric;
  v_unit_cost numeric;
  v_cost numeric;
  v_total numeric := 0;
  v_count integer := 0;
BEGIN
  IF NOT public.ss_is_staff() THEN
    RAISE EXCEPTION 'Staff access required';
  END IF;
  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Nothing to log';
  END IF;

  IF p_visit_id IS NOT NULL THEN
    SELECT customer_id INTO v_customer FROM public.ss_visits WHERE id = p_visit_id;
  ELSIF p_job_id IS NOT NULL THEN
    SELECT customer_id INTO v_customer FROM public.ss_jobs WHERE id = p_job_id;
  END IF;

  FOR it IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_entered := coalesce((it->>'qty')::numeric, 0);
    IF v_entered <= 0 THEN CONTINUE; END IF;

    SELECT * INTO inv FROM public.ss_inventory WHERE id = nullif(it->>'item_id','')::uuid;
    IF inv.id IS NULL THEN CONTINUE; END IF;

    v_unit := nullif(btrim(coalesce(it->>'unit', '')), '');
    IF v_unit IS NULL OR lower(v_unit) = lower(inv.unit) THEN
      v_qty := round(v_entered, 4);
      v_unit := inv.unit;
    ELSE
      v_qty := public.ss_convert_qty(v_entered, v_unit, inv.unit, inv.pack_size, inv.pack_unit);
      IF v_qty IS NULL THEN
        RAISE EXCEPTION 'Cannot convert % % into % for %', v_entered, v_unit, inv.unit, inv.name;
      END IF;
    END IF;

    IF v_qty <= 0 THEN CONTINUE; END IF;

    v_after := round(coalesce(inv.quantity, 0) - v_qty, 2);
    UPDATE public.ss_inventory SET quantity = v_after WHERE id = inv.id;

    v_unit_cost := greatest(coalesce(nullif(it->>'unit_cost','')::numeric, inv.unit_cost, 0), 0);
    v_cost := round(v_qty * v_unit_cost, 2);
    v_total := v_total + v_cost;
    v_count := v_count + 1;

    INSERT INTO public.ss_inventory_moves
      (item_id, item_name, delta, quantity_after, reason, note, actor_id,
       visit_id, job_id, customer_id, unit_cost, total_cost, entered_qty, entered_unit)
    VALUES
      (inv.id, inv.name, -v_qty, v_after, 'usage', nullif(left(coalesce(p_note,''), 400), ''), auth.uid(),
       p_visit_id, p_job_id, v_customer, v_unit_cost, v_cost, v_entered, v_unit);
  END LOOP;

  RETURN jsonb_build_object('items', v_count, 'total_cost', v_total);
END;
$function$;