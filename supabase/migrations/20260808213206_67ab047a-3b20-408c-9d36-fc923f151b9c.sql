
ALTER TABLE public.ss_inventory
  ADD COLUMN IF NOT EXISTS pack_size numeric(12,4),
  ADD COLUMN IF NOT EXISTS pack_unit text;

ALTER TABLE public.ss_inventory_moves
  ADD COLUMN IF NOT EXISTS entered_qty numeric(12,4),
  ADD COLUMN IF NOT EXISTS entered_unit text;

-- Canonical factors: weight -> grams, volume -> milliliters. NULL when the
-- unit is a discrete pack (ea, bag, bucket, case, box, tab) and only an
-- item-specific pack size can convert it.
CREATE OR REPLACE FUNCTION public.ss_unit_factor(p_unit text)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT CASE lower(btrim(coalesce(p_unit, '')))
    WHEN 'g'    THEN 1
    WHEN 'kg'   THEN 1000
    WHEN 'oz'   THEN 28.3495
    WHEN 'lb'   THEN 453.592
    WHEN 'ml'   THEN 1
    WHEN 'l'    THEN 1000
    WHEN 'floz' THEN 29.5735
    WHEN 'fl oz' THEN 29.5735
    WHEN 'qt'   THEN 946.353
    WHEN 'gal'  THEN 3785.41
    ELSE NULL
  END
$$;

CREATE OR REPLACE FUNCTION public.ss_unit_family(p_unit text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN lower(btrim(coalesce(p_unit, ''))) IN ('g','kg','oz','lb') THEN 'weight'
    WHEN lower(btrim(coalesce(p_unit, ''))) IN ('ml','l','floz','fl oz','qt','gal') THEN 'volume'
    ELSE 'count'
  END
$$;

/**
 * Converts p_qty from p_from into p_to. Same-family units use the canonical
 * factors; crossing into a discrete pack unit uses the item's pack size
 * (pack_size of pack_unit per one stock unit). Returns NULL when there is no
 * defined path between the two units.
 */
CREATE OR REPLACE FUNCTION public.ss_convert_qty(
  p_qty numeric,
  p_from text,
  p_to text,
  p_pack_size numeric DEFAULT NULL,
  p_pack_unit text DEFAULT NULL
)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $$
DECLARE
  f numeric;
  t numeric;
  pack numeric;
  via numeric;
BEGIN
  IF p_qty IS NULL THEN RETURN NULL; END IF;
  IF lower(btrim(coalesce(p_from,''))) = lower(btrim(coalesce(p_to,''))) THEN
    RETURN p_qty;
  END IF;

  f := public.ss_unit_factor(p_from);
  t := public.ss_unit_factor(p_to);

  -- Straight measured conversion (same family only).
  IF f IS NOT NULL AND t IS NOT NULL
     AND public.ss_unit_family(p_from) = public.ss_unit_family(p_to) THEN
    RETURN round(p_qty * f / t, 4);
  END IF;

  pack := nullif(coalesce(p_pack_size, 0), 0);
  IF pack IS NULL OR p_pack_unit IS NULL THEN
    RETURN NULL;
  END IF;

  -- Measured -> stock unit: convert into the pack unit, then divide by pack size.
  IF t IS NULL THEN
    via := public.ss_convert_qty(p_qty, p_from, p_pack_unit, NULL, NULL);
    IF via IS NULL THEN RETURN NULL; END IF;
    RETURN round(via / pack, 4);
  END IF;

  -- Stock unit -> measured: multiply out the pack, then convert.
  IF f IS NULL THEN
    RETURN public.ss_convert_qty(p_qty * pack, p_pack_unit, p_to, NULL, NULL);
  END IF;

  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.ss_log_inventory_usage(
  p_items jsonb,
  p_visit_id uuid DEFAULT NULL,
  p_job_id uuid DEFAULT NULL,
  p_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  it jsonb;
  inv public.ss_inventory%ROWTYPE;
  v_qty numeric;
  v_entered numeric;
  v_unit text;
  v_customer uuid;
  v_after numeric;
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

    v_cost := round(v_qty * coalesce(inv.unit_cost, 0), 2);
    v_total := v_total + v_cost;
    v_count := v_count + 1;

    INSERT INTO public.ss_inventory_moves
      (item_id, item_name, delta, quantity_after, reason, note, actor_id,
       visit_id, job_id, customer_id, unit_cost, total_cost, entered_qty, entered_unit)
    VALUES
      (inv.id, inv.name, -v_qty, v_after, 'usage', nullif(left(coalesce(p_note,''), 400), ''), auth.uid(),
       p_visit_id, p_job_id, v_customer, coalesce(inv.unit_cost, 0), v_cost, v_entered, v_unit);
  END LOOP;

  RETURN jsonb_build_object('items', v_count, 'total_cost', v_total);
END;
$$;

REVOKE ALL ON FUNCTION public.ss_unit_factor(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.ss_unit_family(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.ss_convert_qty(numeric, text, text, numeric, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.ss_log_inventory_usage(jsonb, uuid, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ss_convert_qty(numeric, text, text, numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ss_log_inventory_usage(jsonb, uuid, uuid, text) TO authenticated;
