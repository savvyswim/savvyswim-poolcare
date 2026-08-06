-- Internal security register -------------------------------------------------
CREATE TABLE public.security_findings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  internal_id text NOT NULL UNIQUE,
  scanner text NOT NULL DEFAULT 'supabase',
  title text NOT NULL,
  severity text NOT NULL DEFAULT 'warn',
  status text NOT NULL DEFAULT 'open',
  description text,
  remediation text,
  approved_by uuid,
  approved_by_email text,
  approved_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT security_findings_status_chk
    CHECK (status IN ('open','in_progress','fixed','ignored','monitoring'))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.security_findings TO authenticated;
GRANT ALL ON public.security_findings TO service_role;
ALTER TABLE public.security_findings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins read security findings" ON public.security_findings
  FOR SELECT TO authenticated
  USING (public.ss_is_owner() OR private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "admins manage security findings" ON public.security_findings
  FOR ALL TO authenticated
  USING (public.ss_is_owner() OR private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.ss_is_owner() OR private.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER security_findings_updated BEFORE UPDATE ON public.security_findings
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Automated permission check runs ---------------------------------------------
CREATE TABLE public.security_check_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  check_key text NOT NULL,
  passed boolean NOT NULL,
  summary text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  triggered_by text NOT NULL DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.security_check_runs TO authenticated;
GRANT ALL ON public.security_check_runs TO service_role;
ALTER TABLE public.security_check_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins read security checks" ON public.security_check_runs
  FOR SELECT TO authenticated
  USING (public.ss_is_owner() OR private.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX security_check_runs_key_idx
  ON public.security_check_runs (check_key, created_at DESC);

-- Storage permission audit -----------------------------------------------------
CREATE OR REPLACE FUNCTION public.audit_service_photo_rules()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, storage, pg_catalog
AS $$
DECLARE
  results jsonb := '[]'::jsonb;
  is_public boolean;
  bucket_exists boolean;
  read_policy record;
  write_policy record;
  loose_count integer;
  ok boolean;
BEGIN
  SELECT true, b.public INTO bucket_exists, is_public
  FROM storage.buckets b WHERE b.id = 'service-photos';

  results := results || jsonb_build_object(
    'rule', 'bucket_private',
    'passed', coalesce(bucket_exists, false) AND NOT coalesce(is_public, true),
    'detail', CASE
      WHEN NOT coalesce(bucket_exists, false) THEN 'service-photos bucket is missing'
      WHEN coalesce(is_public, true) THEN 'Bucket is PUBLIC — service photos are world readable'
      ELSE 'Bucket is private' END
  );

  -- Customers may only download from their own <customer_id>/ folder.
  SELECT * INTO read_policy FROM pg_policies
  WHERE schemaname = 'storage' AND tablename = 'objects'
    AND cmd = 'SELECT' AND qual LIKE '%service-photos%' AND qual LIKE '%ss_my_customer_id%'
  LIMIT 1;

  results := results || jsonb_build_object(
    'rule', 'customer_download_scoped_to_own_folder',
    'passed', read_policy.policyname IS NOT NULL,
    'detail', coalesce(
      'Policy "' || read_policy.policyname || '" limits reads to storage.foldername(name)[1] = ss_my_customer_id()',
      'MISSING: no policy restricts customer downloads to their own folder')
  );

  -- Uploads/updates/deletes are staff-only.
  SELECT * INTO write_policy FROM pg_policies
  WHERE schemaname = 'storage' AND tablename = 'objects'
    AND qual LIKE '%service-photos%' AND with_check LIKE '%ss_is_staff%'
  LIMIT 1;

  results := results || jsonb_build_object(
    'rule', 'uploads_restricted_to_staff',
    'passed', write_policy.policyname IS NOT NULL,
    'detail', coalesce(
      'Policy "' || write_policy.policyname || '" requires ss_is_staff() to write service photos',
      'MISSING: no staff-only write policy on service-photos')
  );

  -- Nothing may grant anon/public access to the bucket.
  SELECT count(*) INTO loose_count FROM pg_policies
  WHERE schemaname = 'storage' AND tablename = 'objects'
    AND (coalesce(qual, '') LIKE '%service-photos%' OR coalesce(with_check, '') LIKE '%service-photos%')
    AND ('anon' = ANY(roles) OR 'public' = ANY(roles));

  results := results || jsonb_build_object(
    'rule', 'no_anonymous_access',
    'passed', loose_count = 0,
    'detail', CASE WHEN loose_count = 0
      THEN 'No anon/public policies target service-photos'
      ELSE loose_count || ' policy(ies) expose service-photos to anon/public' END
  );

  SELECT bool_and((r->>'passed')::boolean) INTO ok
  FROM jsonb_array_elements(results) r;

  RETURN jsonb_build_object('passed', ok, 'checked_at', now(), 'rules', results);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.audit_service_photo_rules() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.audit_service_photo_rules() TO service_role;