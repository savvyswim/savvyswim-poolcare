DROP POLICY IF EXISTS "Anyone can report a page speed sample" ON public.web_vitals;
CREATE POLICY "Anyone can report a page speed sample"
  ON public.web_vitals FOR INSERT TO anon, authenticated
  WITH CHECK (
    char_length(path) <= 200
    AND metric IN ('LCP','CLS','INP','FCP','TTFB','LOAD','TTI')
    AND value >= 0 AND value < 600000
  );