CREATE TABLE public.ss_user_prefs (
  user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  theme TEXT NOT NULL DEFAULT 'light',
  background TEXT NOT NULL DEFAULT 'canvas',
  accent TEXT NOT NULL DEFAULT 'burgundy',
  density TEXT NOT NULL DEFAULT 'comfortable',
  sidebar_collapsed BOOLEAN NOT NULL DEFAULT false,
  last_workspace TEXT,
  last_paths JSONB NOT NULL DEFAULT '{}'::jsonb,
  pinned_widgets JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ss_user_prefs TO authenticated;
GRANT ALL ON public.ss_user_prefs TO service_role;

ALTER TABLE public.ss_user_prefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own preferences"
  ON public.ss_user_prefs FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.ss_touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_ss_user_prefs_updated_at
  BEFORE UPDATE ON public.ss_user_prefs
  FOR EACH ROW EXECUTE FUNCTION public.ss_touch_updated_at();