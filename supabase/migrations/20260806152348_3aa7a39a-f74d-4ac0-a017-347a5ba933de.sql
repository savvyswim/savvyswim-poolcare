CREATE OR REPLACE FUNCTION public._probe_fn() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT true $$;
REVOKE EXECUTE ON FUNCTION public._probe_fn() FROM PUBLIC, anon, authenticated;
CREATE TABLE IF NOT EXISTS public._rls_probe (id uuid primary key default gen_random_uuid(), v text);
GRANT SELECT ON public._rls_probe TO anon;
ALTER TABLE public._rls_probe ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS probe_read ON public._rls_probe;
CREATE POLICY probe_read ON public._rls_probe FOR SELECT TO anon USING (public._probe_fn());
INSERT INTO public._rls_probe (v) VALUES ('x');