CREATE OR REPLACE FUNCTION public.ss_get_contract(_token text)
RETURNS TABLE(title text, body text, status text, recipient_name text, signer_name text, signed_at timestamptz, sent_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  c public.ss_contracts%ROWTYPE;
BEGIN
  SELECT * INTO c FROM public.ss_contracts WHERE token = _token AND status NOT IN ('draft','voided');
  IF c.id IS NULL THEN RETURN; END IF;

  IF c.viewed_at IS NULL THEN
    UPDATE public.ss_contracts SET viewed_at = now(), status = CASE WHEN status = 'sent' THEN 'viewed' ELSE status END
      WHERE id = c.id;
    INSERT INTO public.ss_contract_events (contract_id, event_type, detail)
      VALUES (c.id, 'viewed', 'Contract opened from signing link');
  END IF;

  RETURN QUERY SELECT c.title, c.body, (SELECT s.status FROM public.ss_contracts s WHERE s.id = c.id),
    c.recipient_name, c.signer_name, c.signed_at, c.sent_at;
END;
$$;

CREATE OR REPLACE FUNCTION public.ss_sign_contract(_token text, _signer_name text, _signature_data_url text, _user_agent text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  c public.ss_contracts%ROWTYPE;
BEGIN
  IF char_length(coalesce(btrim(_signer_name), '')) < 2 OR char_length(_signer_name) > 120 THEN
    RAISE EXCEPTION 'Please type your full legal name';
  END IF;
  IF _signature_data_url IS NULL OR _signature_data_url NOT LIKE 'data:image/png;base64,%' OR char_length(_signature_data_url) > 400000 THEN
    RAISE EXCEPTION 'Signature is missing or invalid';
  END IF;

  SELECT * INTO c FROM public.ss_contracts WHERE token = _token FOR UPDATE;
  IF c.id IS NULL OR c.status IN ('draft','voided') THEN
    RAISE EXCEPTION 'This contract link is no longer valid';
  END IF;
  IF c.status = 'signed' THEN
    RAISE EXCEPTION 'This contract has already been signed';
  END IF;
  IF c.status = 'declined' THEN
    RAISE EXCEPTION 'This contract was declined — ask us to resend it';
  END IF;

  UPDATE public.ss_contracts
     SET status = 'signed',
         signed_at = now(),
         signer_name = btrim(_signer_name),
         signature_data_url = _signature_data_url,
         signer_user_agent = left(coalesce(_user_agent, ''), 400)
   WHERE id = c.id;

  INSERT INTO public.ss_contract_events (contract_id, event_type, detail)
    VALUES (c.id, 'signed', 'Signed by ' || btrim(_signer_name));

  RETURN jsonb_build_object('signed', true, 'signed_at', now(), 'title', c.title);
END;
$$;

REVOKE ALL ON FUNCTION public.ss_get_contract(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ss_sign_contract(text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ss_get_contract(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ss_sign_contract(text, text, text, text) TO anon, authenticated;