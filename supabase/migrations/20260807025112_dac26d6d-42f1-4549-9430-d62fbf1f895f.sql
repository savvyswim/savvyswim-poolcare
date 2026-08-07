ALTER TABLE public.ss_staff
  ADD COLUMN IF NOT EXISTS pay_rate numeric(10,2),
  ADD COLUMN IF NOT EXISTS upsell_pct numeric(5,2);

CREATE TABLE IF NOT EXISTS public.ss_tech_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tech_id uuid NOT NULL REFERENCES public.ss_staff(id) ON DELETE CASCADE,
  effective_date date NOT NULL DEFAULT current_date,
  kind text NOT NULL DEFAULT 'bonus',
  amount numeric(10,2) NOT NULL DEFAULT 0,
  reason text,
  payout_id uuid REFERENCES public.ss_tech_payouts(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ss_tech_adjustments TO authenticated;
GRANT ALL ON public.ss_tech_adjustments TO service_role;

ALTER TABLE public.ss_tech_adjustments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "office manage tech adjustments" ON public.ss_tech_adjustments
  FOR ALL TO authenticated USING (public.ss_is_office()) WITH CHECK (public.ss_is_office());

CREATE POLICY "tech reads own adjustments" ON public.ss_tech_adjustments
  FOR SELECT TO authenticated USING (tech_id = public.ss_my_staff_id());

CREATE TRIGGER ss_tech_adjustments_updated BEFORE UPDATE ON public.ss_tech_adjustments
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE INDEX IF NOT EXISTS ss_tech_adjustments_tech_date_idx
  ON public.ss_tech_adjustments (tech_id, effective_date DESC);