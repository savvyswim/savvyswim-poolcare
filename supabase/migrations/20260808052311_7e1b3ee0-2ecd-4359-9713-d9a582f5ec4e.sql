CREATE TABLE public.ss_security_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,
  actor_kind text NOT NULL DEFAULT 'user',
  actor_user_id uuid,
  actor_staff_id uuid,
  actor_label text,
  subject_table text,
  subject_id text,
  success boolean NOT NULL DEFAULT true,
  outcome text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.ss_security_audit TO authenticated;
GRANT ALL ON public.ss_security_audit TO service_role;

ALTER TABLE public.ss_security_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Office can read the security audit trail"
  ON public.ss_security_audit FOR SELECT TO authenticated
  USING (public.ss_is_office());

CREATE INDEX ss_security_audit_created_idx ON public.ss_security_audit (created_at DESC);
CREATE INDEX ss_security_audit_action_idx ON public.ss_security_audit (action, created_at DESC);