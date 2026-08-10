CREATE TABLE IF NOT EXISTS public.ss_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket text NOT NULL,
  identifier text NOT NULL,
  window_start timestamptz NOT NULL,
  hits integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (bucket, identifier, window_start)
);

GRANT ALL ON public.ss_rate_limits TO service_role;
ALTER TABLE public.ss_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS ss_rate_limits_window_idx ON public.ss_rate_limits (window_start);

CREATE OR REPLACE FUNCTION public.ss_rate_limit_hit(
  _bucket text,
  _identifier text,
  _window_seconds integer,
  _max_hits integer
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _win timestamptz;
  _hits integer;
BEGIN
  _win := to_timestamp(floor(extract(epoch from now()) / _window_seconds) * _window_seconds);

  INSERT INTO public.ss_rate_limits (bucket, identifier, window_start, hits)
  VALUES (_bucket, _identifier, _win, 1)
  ON CONFLICT (bucket, identifier, window_start)
  DO UPDATE SET hits = public.ss_rate_limits.hits + 1
  RETURNING hits INTO _hits;

  DELETE FROM public.ss_rate_limits WHERE window_start < now() - interval '1 day';

  RETURN _hits <= _max_hits;
END;
$$;

REVOKE ALL ON FUNCTION public.ss_rate_limit_hit(text, text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ss_rate_limit_hit(text, text, integer, integer) TO service_role;