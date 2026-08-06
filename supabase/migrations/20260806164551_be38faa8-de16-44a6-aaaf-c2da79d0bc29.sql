ALTER TABLE public.ss_invoice_items
  ADD COLUMN IF NOT EXISTS visit_id uuid REFERENCES public.ss_visits(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_upsell boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS unit_cost numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sold_by_tech_id uuid REFERENCES public.ss_staff(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS ss_invoice_items_visit_idx ON public.ss_invoice_items(visit_id);

-- Default commission percent used when a pool has no override.
CREATE OR REPLACE FUNCTION public.ss_default_upsell_pct()
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    NULLIF((SELECT (value ->> 'upsell_pct') FROM public.ss_settings WHERE key = 'pay_per_pool'), '')::numeric,
    10
  )
$$;

-- Recompute a visit's upsell total + tech commission from its invoice lines.
CREATE OR REPLACE FUNCTION public.ss_recalc_visit_upsell(_visit_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v public.ss_visits%ROWTYPE;
  v_total numeric(10,2);
  v_pct numeric;
BEGIN
  IF _visit_id IS NULL THEN RETURN; END IF;

  SELECT * INTO v FROM public.ss_visits WHERE id = _visit_id;
  IF v.id IS NULL OR v.payout_id IS NOT NULL THEN
    RETURN; -- locked into a paid-out period: never rewrite history
  END IF;

  SELECT COALESCE(sum(line_total), 0) INTO v_total
  FROM public.ss_invoice_items
  WHERE visit_id = _visit_id AND is_upsell = true;

  SELECT COALESCE(c.tech_upsell_pct, public.ss_default_upsell_pct())
    INTO v_pct
  FROM public.ss_customers c WHERE c.id = v.customer_id;

  v_pct := COALESCE(v_pct, public.ss_default_upsell_pct());

  UPDATE public.ss_visits
     SET upsell_amount = v_total,
         upsell_commission = round(v_total * v_pct / 100, 2)
   WHERE id = _visit_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.ss_tg_invoice_item_upsell()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP <> 'INSERT' AND OLD.visit_id IS NOT NULL THEN
    PERFORM public.ss_recalc_visit_upsell(OLD.visit_id);
  END IF;
  IF TG_OP <> 'DELETE' AND NEW.visit_id IS NOT NULL
     AND (TG_OP = 'INSERT' OR NEW.visit_id IS DISTINCT FROM OLD.visit_id) THEN
    PERFORM public.ss_recalc_visit_upsell(NEW.visit_id);
  ELSIF TG_OP <> 'DELETE' AND NEW.visit_id IS NOT NULL THEN
    PERFORM public.ss_recalc_visit_upsell(NEW.visit_id);
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS ss_invoice_items_upsell ON public.ss_invoice_items;
CREATE TRIGGER ss_invoice_items_upsell
AFTER INSERT OR UPDATE OR DELETE ON public.ss_invoice_items
FOR EACH ROW EXECUTE FUNCTION public.ss_tg_invoice_item_upsell();

-- Customer-safe invoice lines: no cost, no upsell flag, no commission.
CREATE OR REPLACE FUNCTION public.ss_my_invoice_lines(_invoice_id uuid)
RETURNS TABLE(description text, quantity numeric, unit_price numeric, line_total numeric)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT i.description, i.quantity, i.unit_price, i.line_total
  FROM public.ss_invoice_items i
  JOIN public.ss_invoices inv ON inv.id = i.invoice_id
  WHERE i.invoice_id = _invoice_id
    AND inv.customer_id = public.ss_my_customer_id()
  ORDER BY i.created_at
$$;

REVOKE ALL ON FUNCTION public.ss_recalc_visit_upsell(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ss_default_upsell_pct() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ss_my_invoice_lines(uuid) TO authenticated;