CREATE TABLE public.ss_server_errors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  fingerprint TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'ssr',
  message TEXT NOT NULL,
  stack TEXT,
  route TEXT,
  method TEXT,
  status_code INTEGER,
  boot_id TEXT,
  user_agent TEXT,
  ip_address TEXT,
  occurrences INTEGER NOT NULL DEFAULT 1,
  alert_sent BOOLEAN NOT NULL DEFAULT false,
  alert_result TEXT
);

CREATE INDEX ss_server_errors_occurred_at_idx ON public.ss_server_errors (occurred_at DESC);
CREATE INDEX ss_server_errors_fingerprint_idx ON public.ss_server_errors (fingerprint, occurred_at DESC);

GRANT SELECT ON public.ss_server_errors TO authenticated;
GRANT ALL ON public.ss_server_errors TO service_role;

ALTER TABLE public.ss_server_errors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Office staff can read server errors"
  ON public.ss_server_errors FOR SELECT TO authenticated
  USING (public.ss_is_office());