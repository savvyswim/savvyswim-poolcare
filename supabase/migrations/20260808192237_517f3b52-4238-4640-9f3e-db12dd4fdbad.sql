ALTER TABLE public.ss_contracts
  ADD COLUMN IF NOT EXISTS doc_kind text NOT NULL DEFAULT 'agreement';

CREATE OR REPLACE FUNCTION public.ss_my_documents()
RETURNS TABLE(
  id uuid,
  title text,
  doc_kind text,
  status text,
  token text,
  sent_at timestamptz,
  viewed_at timestamptz,
  signed_at timestamptz,
  signer_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id, c.title, c.doc_kind, c.status, c.token, c.sent_at, c.viewed_at, c.signed_at, c.signer_name
  FROM public.ss_contracts c
  WHERE c.customer_id = public.ss_my_customer_id()
    AND c.status NOT IN ('draft','voided')
  ORDER BY (c.status = 'signed'), coalesce(c.sent_at, c.created_at) DESC
$$;

REVOKE ALL ON FUNCTION public.ss_my_documents() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ss_my_documents() TO authenticated;