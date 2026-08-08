CREATE TABLE public.ss_inventory_moves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.ss_inventory(id) ON DELETE CASCADE,
  item_name text NOT NULL,
  delta numeric NOT NULL,
  quantity_after numeric NOT NULL,
  reason text NOT NULL DEFAULT 'adjustment',
  note text,
  actor_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ss_inventory_moves_item_idx ON public.ss_inventory_moves (item_id, created_at DESC);
CREATE INDEX ss_inventory_moves_created_idx ON public.ss_inventory_moves (created_at DESC);

GRANT SELECT, INSERT ON public.ss_inventory_moves TO authenticated;
GRANT ALL ON public.ss_inventory_moves TO service_role;

ALTER TABLE public.ss_inventory_moves ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff read inventory moves"
  ON public.ss_inventory_moves FOR SELECT TO authenticated
  USING (public.ss_is_staff());

CREATE POLICY "office log inventory moves"
  ON public.ss_inventory_moves FOR INSERT TO authenticated
  WITH CHECK (public.ss_is_office() AND actor_id = auth.uid());