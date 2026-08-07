CREATE TABLE public.ss_client_errors (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid references auth.users on delete set null,
  surface text not null default 'crm',
  route text,
  message text not null,
  stack text,
  context jsonb not null default '{}'::jsonb,
  user_agent text
);
GRANT INSERT ON public.ss_client_errors TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ss_client_errors TO service_role;
GRANT ALL ON public.ss_client_errors TO service_role;
ALTER TABLE public.ss_client_errors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone signed in can report an error"
  ON public.ss_client_errors FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);
CREATE POLICY "office can read error reports"
  ON public.ss_client_errors FOR SELECT TO authenticated
  USING (public.ss_is_office());
CREATE INDEX ss_client_errors_created_idx ON public.ss_client_errors (created_at DESC);