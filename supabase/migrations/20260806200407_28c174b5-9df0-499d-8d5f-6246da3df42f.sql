CREATE OR REPLACE FUNCTION public.ss_get_contract(_token text)
RETURNS TABLE(title text, body text, status text, recipient_name text, signer_name text, signed_at timestamptz, sent_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  c public.ss_contracts%ROWTYPE;
BEGIN
  SELECT * INTO c FROM public.ss_contracts t WHERE t.token = _token AND t.status NOT IN ('draft','voided');
  IF c.id IS NULL THEN RETURN; END IF;

  IF c.viewed_at IS NULL THEN
    UPDATE public.ss_contracts t
       SET viewed_at = now(),
           status = CASE WHEN t.status = 'sent' THEN 'viewed' ELSE t.status END
     WHERE t.id = c.id;
    INSERT INTO public.ss_contract_events (contract_id, event, detail)
      VALUES (c.id, 'viewed', 'Contract opened from signing link');
  END IF;

  RETURN QUERY SELECT c.title, c.body, (SELECT s.status FROM public.ss_contracts s WHERE s.id = c.id),
    c.recipient_name, c.signer_name, c.signed_at, c.sent_at;
END;
$$;