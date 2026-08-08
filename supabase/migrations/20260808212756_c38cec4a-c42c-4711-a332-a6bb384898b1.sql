
ALTER TABLE public.ss_inventory_moves
  ADD COLUMN IF NOT EXISTS visit_id uuid REFERENCES public.ss_visits(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS job_id uuid REFERENCES public.ss_jobs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES public.ss_customers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS unit_cost numeric(10,2),
  ADD COLUMN IF NOT EXISTS total_cost numeric(10,2);

CREATE INDEX IF NOT EXISTS ss_inventory_moves_visit_idx ON public.ss_inventory_moves(visit_id);
CREATE INDEX IF NOT EXISTS ss_inventory_moves_job_idx ON public.ss_inventory_moves(job_id);

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
    v_qty := round(coalesce((it->>'qty')::numeric, 0), 2);
    IF v_qty <= 0 THEN CONTINUE; END IF;

    SELECT * INTO inv FROM public.ss_inventory WHERE id = nullif(it->>'item_id','')::uuid;
    IF inv.id IS NULL THEN CONTINUE; END IF;

    v_after := coalesce(inv.quantity, 0) - v_qty;
    UPDATE public.ss_inventory SET quantity = v_after WHERE id = inv.id;

    v_cost := round(v_qty * coalesce(inv.unit_cost, 0), 2);
    v_total := v_total + v_cost;
    v_count := v_count + 1;

    INSERT INTO public.ss_inventory_moves
      (item_id, item_name, delta, quantity_after, reason, note, actor_id,
       visit_id, job_id, customer_id, unit_cost, total_cost)
    VALUES
      (inv.id, inv.name, -v_qty, v_after, 'usage', nullif(left(coalesce(p_note,''), 400), ''), auth.uid(),
       p_visit_id, p_job_id, v_customer, coalesce(inv.unit_cost, 0), v_cost);
  END LOOP;

  RETURN jsonb_build_object('items', v_count, 'total_cost', v_total);
END;
$$;

REVOKE ALL ON FUNCTION public.ss_log_inventory_usage(jsonb, uuid, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ss_log_inventory_usage(jsonb, uuid, uuid, text) TO authenticated;
