ALTER TABLE public.ss_leads
  ADD COLUMN IF NOT EXISTS plan_id text,
  ADD COLUMN IF NOT EXISTS plan_status text NOT NULL DEFAULT 'recommended',
  ADD COLUMN IF NOT EXISTS plan_assigned_at timestamptz;

CREATE OR REPLACE FUNCTION public.ss_match_service_plan(p_condition text, p_service_type text, p_pool_size text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN lower(coalesce(p_condition, '')) IN ('green', 'neglected') THEN 'recovery'
    WHEN lower(coalesce(p_service_type, '')) IN ('chem_only', 'chem-only', 'chem') THEN 'chem-check'
    WHEN lower(coalesce(p_pool_size, '')) IN ('large', 'xl') THEN 'complete'
    ELSE 'signature'
  END
$$;

CREATE OR REPLACE FUNCTION public.ss_tg_lead_plan()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.plan_id IS NULL THEN
    NEW.plan_id := public.ss_match_service_plan(NEW.condition, NEW.service_type, NEW.pool_size);
    NEW.plan_assigned_at := now();
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.stage IS DISTINCT FROM OLD.stage THEN
    NEW.plan_status := CASE NEW.stage::text
      WHEN 'quote_sent' THEN 'quoted'
      WHEN 'follow_up' THEN 'quoted'
      WHEN 'won' THEN 'won'
      WHEN 'lost' THEN 'lost'
      ELSE 'recommended'
    END;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ss_leads_plan ON public.ss_leads;
CREATE TRIGGER ss_leads_plan
BEFORE INSERT OR UPDATE ON public.ss_leads
FOR EACH ROW EXECUTE FUNCTION public.ss_tg_lead_plan();

UPDATE public.ss_leads
SET plan_id = public.ss_match_service_plan(condition, service_type, pool_size),
    plan_assigned_at = coalesce(plan_assigned_at, created_at),
    plan_status = CASE stage::text
      WHEN 'quote_sent' THEN 'quoted'
      WHEN 'follow_up' THEN 'quoted'
      WHEN 'won' THEN 'won'
      WHEN 'lost' THEN 'lost'
      ELSE 'recommended' END
WHERE plan_id IS NULL;