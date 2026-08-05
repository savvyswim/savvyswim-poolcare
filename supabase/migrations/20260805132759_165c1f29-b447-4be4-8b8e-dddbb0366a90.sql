CREATE TABLE public.ss_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('asset','liability','equity','income','expense')),
  description text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ss_accounts TO authenticated;
GRANT ALL ON public.ss_accounts TO service_role;
ALTER TABLE public.ss_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Office can read accounts" ON public.ss_accounts FOR SELECT TO authenticated USING (public.ss_is_office());
CREATE POLICY "Office can write accounts" ON public.ss_accounts FOR INSERT TO authenticated WITH CHECK (public.ss_is_office());
CREATE POLICY "Office can update accounts" ON public.ss_accounts FOR UPDATE TO authenticated USING (public.ss_is_office()) WITH CHECK (public.ss_is_office());
CREATE POLICY "Owner can delete accounts" ON public.ss_accounts FOR DELETE TO authenticated USING (public.ss_is_owner());
CREATE TRIGGER ss_accounts_updated BEFORE UPDATE ON public.ss_accounts FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE public.ss_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_date date NOT NULL DEFAULT current_date,
  account_id uuid REFERENCES public.ss_accounts(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES public.ss_customers(id) ON DELETE SET NULL,
  memo text NOT NULL,
  debit numeric(12,2) NOT NULL DEFAULT 0,
  credit numeric(12,2) NOT NULL DEFAULT 0,
  source text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','invoice','payment','expense','payroll','adjustment')),
  ref_id uuid,
  reference text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ss_ledger_date_idx ON public.ss_ledger (entry_date DESC);
CREATE INDEX ss_ledger_account_idx ON public.ss_ledger (account_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ss_ledger TO authenticated;
GRANT ALL ON public.ss_ledger TO service_role;
ALTER TABLE public.ss_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Office can read ledger" ON public.ss_ledger FOR SELECT TO authenticated USING (public.ss_is_office());
CREATE POLICY "Office can write ledger" ON public.ss_ledger FOR INSERT TO authenticated WITH CHECK (public.ss_is_office());
CREATE POLICY "Office can update ledger" ON public.ss_ledger FOR UPDATE TO authenticated USING (public.ss_is_office()) WITH CHECK (public.ss_is_office());
CREATE POLICY "Owner can delete ledger" ON public.ss_ledger FOR DELETE TO authenticated USING (public.ss_is_owner());
CREATE TRIGGER ss_ledger_updated BEFORE UPDATE ON public.ss_ledger FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE public.ss_invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.ss_invoices(id) ON DELETE CASCADE,
  description text NOT NULL,
  quantity numeric(10,2) NOT NULL DEFAULT 1,
  unit_price numeric(10,2) NOT NULL DEFAULT 0,
  line_total numeric(10,2) NOT NULL DEFAULT 0,
  account_id uuid REFERENCES public.ss_accounts(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ss_invoice_items_invoice_idx ON public.ss_invoice_items (invoice_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ss_invoice_items TO authenticated;
GRANT ALL ON public.ss_invoice_items TO service_role;
ALTER TABLE public.ss_invoice_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Office can read invoice items" ON public.ss_invoice_items FOR SELECT TO authenticated USING (public.ss_is_office());
CREATE POLICY "Office can write invoice items" ON public.ss_invoice_items FOR INSERT TO authenticated WITH CHECK (public.ss_is_office());
CREATE POLICY "Office can update invoice items" ON public.ss_invoice_items FOR UPDATE TO authenticated USING (public.ss_is_office()) WITH CHECK (public.ss_is_office());
CREATE POLICY "Owner can delete invoice items" ON public.ss_invoice_items FOR DELETE TO authenticated USING (public.ss_is_owner());