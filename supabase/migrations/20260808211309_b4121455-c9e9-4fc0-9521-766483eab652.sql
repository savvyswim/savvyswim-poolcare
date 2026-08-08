CREATE TABLE public.ss_route_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.ss_customers(id) ON DELETE CASCADE,
  water_body_id uuid REFERENCES public.ss_water_bodies(id) ON DELETE SET NULL,
  tech_id uuid REFERENCES public.ss_staff(id) ON DELETE SET NULL,
  label text NOT NULL DEFAULT 'Service route',
  frequency text NOT NULL DEFAULT 'weekly',
  interval_weeks integer NOT NULL DEFAULT 1,
  weekdays integer[] NOT NULL DEFAULT '{2}',
  month_day integer,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  stop_order integer NOT NULL DEFAULT 0,
  minutes_at_stop integer,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  last_generated_through date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ss_route_schedules_customer_idx ON public.ss_route_schedules (customer_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ss_route_schedules TO authenticated;
GRANT ALL ON public.ss_route_schedules TO service_role;

ALTER TABLE public.ss_route_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff read route schedules" ON public.ss_route_schedules
  FOR SELECT TO authenticated USING (public.ss_is_staff());

CREATE POLICY "office manage route schedules" ON public.ss_route_schedules
  FOR ALL TO authenticated USING (public.ss_is_office()) WITH CHECK (public.ss_is_office());

CREATE TRIGGER ss_route_schedules_updated
  BEFORE UPDATE ON public.ss_route_schedules
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE OR REPLACE FUNCTION public.ss_validate_route_schedule()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.frequency NOT IN ('weekly','biweekly','every_n_weeks','monthly') THEN
    RAISE EXCEPTION 'Unsupported frequency %', NEW.frequency;
  END IF;
  IF NEW.interval_weeks < 1 OR NEW.interval_weeks > 12 THEN
    RAISE EXCEPTION 'Interval must be between 1 and 12 weeks';
  END IF;
  IF NEW.end_date IS NOT NULL AND NEW.end_date < NEW.start_date THEN
    RAISE EXCEPTION 'End date cannot be before the start date';
  END IF;
  IF NEW.frequency = 'weekly' THEN NEW.interval_weeks := 1; END IF;
  IF NEW.frequency = 'biweekly' THEN NEW.interval_weeks := 2; END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER ss_route_schedules_validate
  BEFORE INSERT OR UPDATE ON public.ss_route_schedules
  FOR EACH ROW EXECUTE FUNCTION public.ss_validate_route_schedule();

-- Builds the concrete visits for one customer's active schedules through a date.
CREATE OR REPLACE FUNCTION public.ss_generate_route_visits(p_customer_id uuid, p_through date)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s record;
  d date;
  made integer := 0;
  anchor date;
  weeks integer;
BEGIN
  IF NOT public.ss_is_office() THEN
    RAISE EXCEPTION 'Only the office can build routes';
  END IF;

  FOR s IN
    SELECT * FROM public.ss_route_schedules
    WHERE customer_id = p_customer_id AND is_active
  LOOP
    anchor := date_trunc('week', s.start_date::timestamp)::date; -- Monday of the start week
    d := GREATEST(s.start_date, CURRENT_DATE);
    WHILE d <= LEAST(p_through, COALESCE(s.end_date, p_through)) LOOP
      IF s.frequency = 'monthly' THEN
        IF EXTRACT(DAY FROM d)::int = COALESCE(s.month_day, EXTRACT(DAY FROM s.start_date)::int) THEN
          IF NOT EXISTS (
            SELECT 1 FROM public.ss_visits v
            WHERE v.customer_id = s.customer_id AND v.scheduled_date = d
          ) THEN
            INSERT INTO public.ss_visits (customer_id, tech_id, water_body_id, scheduled_date, stop_order)
            VALUES (s.customer_id, s.tech_id, s.water_body_id, d, s.stop_order);
            made := made + 1;
          END IF;
        END IF;
      ELSE
        weeks := (date_trunc('week', d::timestamp)::date - anchor) / 7;
        IF weeks >= 0
           AND weeks % s.interval_weeks = 0
           AND (EXTRACT(ISODOW FROM d)::int % 7) = ANY (s.weekdays)
        THEN
          IF NOT EXISTS (
            SELECT 1 FROM public.ss_visits v
            WHERE v.customer_id = s.customer_id AND v.scheduled_date = d
          ) THEN
            INSERT INTO public.ss_visits (customer_id, tech_id, water_body_id, scheduled_date, stop_order)
            VALUES (s.customer_id, s.tech_id, s.water_body_id, d, s.stop_order);
            made := made + 1;
          END IF;
        END IF;
      END IF;
      d := d + 1;
    END LOOP;

    UPDATE public.ss_route_schedules
      SET last_generated_through = LEAST(p_through, COALESCE(s.end_date, p_through))
      WHERE id = s.id;
  END LOOP;

  RETURN made;
END;
$$;

REVOKE ALL ON FUNCTION public.ss_generate_route_visits(uuid, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ss_generate_route_visits(uuid, date) TO authenticated;
REVOKE ALL ON FUNCTION public.ss_validate_route_schedule() FROM PUBLIC, anon, authenticated;