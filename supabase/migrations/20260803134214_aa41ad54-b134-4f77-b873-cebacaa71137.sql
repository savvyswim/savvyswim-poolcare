CREATE TABLE public.cleaning_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  blurb text NOT NULL DEFAULT '',
  price text NOT NULL DEFAULT '',
  cadence text NOT NULL DEFAULT '/ month',
  items text[] NOT NULL DEFAULT '{}'::text[],
  featured boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.cleaning_plans TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cleaning_plans TO authenticated;
GRANT ALL ON public.cleaning_plans TO service_role;

ALTER TABLE public.cleaning_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active cleaning plans"
  ON public.cleaning_plans FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins manage cleaning plans"
  ON public.cleaning_plans FOR ALL
  TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER cleaning_plans_updated_at
  BEFORE UPDATE ON public.cleaning_plans
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

INSERT INTO public.cleaning_plans (name, blurb, price, cadence, items, featured, display_order) VALUES
('Essential Clean', 'Bi-weekly visits for low-traffic backyards.', '$149', '/ month', ARRAY['2 visits per month','Skim, brush & vacuum','Basket & skimmer cleanout','Water chemistry balance','Digital service report'], false, 1),
('Weekly Crystal', 'Our most popular DFW weekly service.', '$219', '/ month', ARRAY['4 visits per month','Full chemical package included','Filter pressure check','Equipment inspection each visit','Photo report after every clean','Priority scheduling'], true, 2),
('Total Care', 'Hands-off ownership, pool always guest-ready.', '$349', '/ month', ARRAY['4 visits + on-call touch-ups','Chemicals, salt & tabs included','Quarterly filter deep clean','Free minor equipment repairs','Seasonal open/close service','24/7 text support'], false, 3);