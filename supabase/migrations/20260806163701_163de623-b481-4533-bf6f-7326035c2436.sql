ALTER TABLE public.ss_customers
  ADD COLUMN IF NOT EXISTS tech_pay_rate numeric(10,2),
  ADD COLUMN IF NOT EXISTS tech_upsell_pct numeric(5,2);

ALTER TABLE public.ss_visits
  ADD COLUMN IF NOT EXISTS tech_pay numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tech_bonus numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS upsell_amount numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS upsell_commission numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pay_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS payout_id uuid;

CREATE TABLE IF NOT EXISTS public.ss_tech_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tech_id uuid NOT NULL REFERENCES public.ss_staff(id) ON DELETE CASCADE,
  invoice_number text NOT NULL DEFAULT ('PAY-' || to_char(now(), 'YYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,4))),
  period_start date NOT NULL,
  period_end date NOT NULL,
  pools_count integer NOT NULL DEFAULT 0,
  base_pay numeric(10,2) NOT NULL DEFAULT 0,
  bonus_pay numeric(10,2) NOT NULL DEFAULT 0,
  commission_pay numeric(10,2) NOT NULL DEFAULT 0,
  adjustments numeric(10,2) NOT NULL DEFAULT 0,
  total_pay numeric(10,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft',
  notes text,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ss_tech_payouts TO authenticated;
GRANT ALL ON public.ss_tech_payouts TO service_role;
ALTER TABLE public.ss_tech_payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "office manages payouts" ON public.ss_tech_payouts
  FOR ALL TO authenticated
  USING (public.ss_is_office())
  WITH CHECK (public.ss_is_office());

CREATE POLICY "tech reads own payouts" ON public.ss_tech_payouts
  FOR SELECT TO authenticated
  USING (tech_id = public.ss_my_staff_id());

CREATE TRIGGER ss_tech_payouts_updated BEFORE UPDATE ON public.ss_tech_payouts
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE INDEX IF NOT EXISTS ss_visits_payout_idx ON public.ss_visits (payout_id);
CREATE INDEX IF NOT EXISTS ss_visits_tech_date_idx ON public.ss_visits (tech_id, scheduled_date);