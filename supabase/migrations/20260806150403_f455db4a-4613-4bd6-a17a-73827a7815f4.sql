CREATE TABLE public.ss_lead_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.ss_leads(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  label text NOT NULL,
  detail text,
  actor_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ss_lead_events_lead_idx ON public.ss_lead_events(lead_id, created_at DESC);

GRANT SELECT, INSERT ON public.ss_lead_events TO authenticated;
GRANT ALL ON public.ss_lead_events TO service_role;

ALTER TABLE public.ss_lead_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view lead events" ON public.ss_lead_events
  FOR SELECT TO authenticated USING (public.ss_is_staff());
CREATE POLICY "Staff can add lead events" ON public.ss_lead_events
  FOR INSERT TO authenticated WITH CHECK (public.ss_is_staff());

CREATE OR REPLACE FUNCTION public.ss_tg_lead_events()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.ss_lead_events(lead_id, event_type, label, detail, actor_id)
    VALUES (NEW.id, 'created', 'Lead created', COALESCE(NEW.source, 'manual'), auth.uid());
    IF NEW.plan_id IS NOT NULL THEN
      INSERT INTO public.ss_lead_events(lead_id, event_type, label, detail, actor_id)
      VALUES (NEW.id, 'plan_matched', 'Service plan matched', NEW.plan_id, auth.uid());
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.plan_id IS DISTINCT FROM OLD.plan_id AND NEW.plan_id IS NOT NULL THEN
    INSERT INTO public.ss_lead_events(lead_id, event_type, label, detail, actor_id)
    VALUES (NEW.id, 'plan_matched',
      CASE WHEN OLD.plan_id IS NULL THEN 'Service plan matched' ELSE 'Service plan changed' END,
      NEW.plan_id, auth.uid());
  END IF;

  IF NEW.plan_status IS DISTINCT FROM OLD.plan_status THEN
    INSERT INTO public.ss_lead_events(lead_id, event_type, label, detail, actor_id)
    VALUES (NEW.id,
      CASE WHEN NEW.plan_status = 'quoted' THEN 'plan_quoted' ELSE 'plan_status' END,
      CASE WHEN NEW.plan_status = 'quoted' THEN 'Plan quoted'
           WHEN NEW.plan_status = 'won' THEN 'Plan won'
           WHEN NEW.plan_status = 'lost' THEN 'Plan lost'
           ELSE 'Plan status updated' END,
      NEW.plan_status, auth.uid());
  END IF;

  IF NEW.stage IS DISTINCT FROM OLD.stage THEN
    INSERT INTO public.ss_lead_events(lead_id, event_type, label, detail, actor_id)
    VALUES (NEW.id, 'stage', 'Stage changed', OLD.stage::text || ' -> ' || NEW.stage::text, auth.uid());
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER ss_lead_events_ins AFTER INSERT ON public.ss_leads
  FOR EACH ROW EXECUTE FUNCTION public.ss_tg_lead_events();
CREATE TRIGGER ss_lead_events_upd AFTER UPDATE ON public.ss_leads
  FOR EACH ROW EXECUTE FUNCTION public.ss_tg_lead_events();

INSERT INTO public.ss_lead_events (lead_id, event_type, label, detail, created_at)
SELECT id, 'created', 'Lead created', COALESCE(source, 'manual'), created_at FROM public.ss_leads;

INSERT INTO public.ss_lead_events (lead_id, event_type, label, detail, created_at)
SELECT id, 'plan_matched', 'Service plan matched', plan_id, COALESCE(plan_assigned_at, created_at)
FROM public.ss_leads WHERE plan_id IS NOT NULL;

INSERT INTO public.ss_lead_events (lead_id, event_type, label, detail, created_at)
SELECT id, 'stage', 'Stage changed', 'current: ' || stage::text, stage_changed_at
FROM public.ss_leads WHERE stage_changed_at IS NOT NULL AND stage::text <> 'new_lead';