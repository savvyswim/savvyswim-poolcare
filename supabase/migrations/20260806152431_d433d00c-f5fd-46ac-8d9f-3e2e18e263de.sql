DROP POLICY IF EXISTS probe_read ON public._rls_probe;
DROP TABLE IF EXISTS public._rls_probe;
DROP FUNCTION IF EXISTS public._probe_fn();

CREATE OR REPLACE FUNCTION public.ss_visits_guard_reassignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.ss_is_office() THEN
    RETURN NEW;
  END IF;

  IF NEW.customer_id IS DISTINCT FROM OLD.customer_id THEN
    RAISE EXCEPTION 'Only office staff can move a visit to another customer';
  END IF;

  IF NEW.tech_id IS DISTINCT FROM OLD.tech_id THEN
    RAISE EXCEPTION 'Only office staff can reassign a visit to another technician';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.ss_visits_guard_reassignment() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS ss_visits_guard_reassignment ON public.ss_visits;
CREATE TRIGGER ss_visits_guard_reassignment
BEFORE UPDATE ON public.ss_visits
FOR EACH ROW EXECUTE FUNCTION public.ss_visits_guard_reassignment();