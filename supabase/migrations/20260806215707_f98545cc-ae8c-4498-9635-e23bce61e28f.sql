CREATE TABLE public.web_vitals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  path text NOT NULL,
  metric text NOT NULL,
  value numeric NOT NULL,
  rating text,
  device text,
  connection text,
  nav_type text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX web_vitals_path_metric_created_idx ON public.web_vitals (path, metric, created_at DESC);

GRANT INSERT ON public.web_vitals TO anon, authenticated;
GRANT SELECT ON public.web_vitals TO authenticated;
GRANT ALL ON public.web_vitals TO service_role;

ALTER TABLE public.web_vitals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can report a page speed sample"
  ON public.web_vitals FOR INSERT TO anon, authenticated
  WITH CHECK (
    char_length(path) <= 200
    AND metric IN ('LCP','CLS','INP','FCP','TTFB','LOAD')
    AND value >= 0 AND value < 600000
  );

CREATE POLICY "Staff can read page speed samples"
  ON public.web_vitals FOR SELECT TO authenticated
  USING (public.ss_is_staff());