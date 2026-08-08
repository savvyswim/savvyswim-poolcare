CREATE OR REPLACE FUNCTION public.ss_portal_pay_invoice(
  p_invoice_id uuid,
  p_method text,
  p_reference text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c public.ss_customers%ROWTYPE;
  inv public.ss_invoices%ROWTYPE;
  v_method text := lower(btrim(coalesce(p_method, '')));
  v_ref text := nullif(btrim(left(coalesce(p_reference, ''), 120)), '');
BEGIN
  IF v_method NOT IN ('card', 'ach', 'phone') THEN
    RAISE EXCEPTION 'Choose a payment method';
  END IF;

  SELECT * INTO inv FROM public.ss_invoices WHERE id = p_invoice_id;
  IF inv.id IS NULL THEN
    RAISE EXCEPTION 'Invoice not found';
  END IF;

  SELECT * INTO c FROM public.ss_customers
    WHERE id = inv.customer_id AND user_id = auth.uid();
  IF c.id IS NULL THEN
    RAISE EXCEPTION 'Invoice not found';
  END IF;

  IF inv.status = 'paid' THEN
    RAISE EXCEPTION 'This invoice is already paid';
  END IF;
  IF inv.status = 'processing' THEN
    RAISE EXCEPTION 'A payment on this invoice is already processing';
  END IF;

  UPDATE public.ss_invoices SET status = 'processing' WHERE id = inv.id;

  INSERT INTO public.ss_feed (customer_id, kind, title, body)
  VALUES (
    c.id,
    'payment',
    'Payment started for ' || inv.invoice_number,
    '$' || to_char(inv.amount, 'FM999999990.00') || ' · '
      || CASE v_method WHEN 'card' THEN 'Card' WHEN 'ach' THEN 'Bank transfer' ELSE 'Pay by phone' END
      || coalesce(' · ref ' || v_ref, '')
      || ' — we will email a receipt once it clears.'
  );

  INSERT INTO public.ss_alerts (customer_id, tech_id, priority, title, body)
  VALUES (
    c.id,
    c.assigned_tech_id,
    'normal',
    'Portal payment started — ' || c.full_name,
    inv.invoice_number || ' · $' || to_char(inv.amount, 'FM999999990.00') || ' · ' || v_method
      || coalesce(' · ref ' || v_ref, '')
  );

  RETURN jsonb_build_object(
    'invoice_number', inv.invoice_number,
    'amount', inv.amount,
    'status', 'processing',
    'method', v_method
  );
END;
$$;

REVOKE ALL ON FUNCTION public.ss_portal_pay_invoice(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ss_portal_pay_invoice(uuid, text, text) TO authenticated;