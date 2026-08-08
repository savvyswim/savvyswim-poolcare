CREATE TABLE public.ss_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.ss_customers(id) ON DELETE CASCADE,
  subject text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  status text NOT NULL DEFAULT 'new',
  priority text NOT NULL DEFAULT 'normal',
  last_message_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.ss_ticket_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.ss_tickets(id) ON DELETE CASCADE,
  author_kind text NOT NULL DEFAULT 'customer',
  author_user_id uuid,
  author_label text,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ss_tickets_customer_idx ON public.ss_tickets (customer_id, last_message_at DESC);
CREATE INDEX ss_ticket_messages_ticket_idx ON public.ss_ticket_messages (ticket_id, created_at);

GRANT SELECT, INSERT, UPDATE ON public.ss_tickets TO authenticated;
GRANT ALL ON public.ss_tickets TO service_role;
GRANT SELECT, INSERT ON public.ss_ticket_messages TO authenticated;
GRANT ALL ON public.ss_ticket_messages TO service_role;

ALTER TABLE public.ss_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ss_ticket_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers see their own tickets"
ON public.ss_tickets FOR SELECT TO authenticated
USING (customer_id = public.ss_my_customer_id() OR public.ss_is_staff());

CREATE POLICY "Customers open their own tickets"
ON public.ss_tickets FOR INSERT TO authenticated
WITH CHECK (customer_id = public.ss_my_customer_id() OR public.ss_is_staff());

CREATE POLICY "Staff manage tickets"
ON public.ss_tickets FOR UPDATE TO authenticated
USING (public.ss_is_staff())
WITH CHECK (public.ss_is_staff());

CREATE POLICY "Read messages on visible tickets"
ON public.ss_ticket_messages FOR SELECT TO authenticated
USING (
  public.ss_is_staff()
  OR EXISTS (
    SELECT 1 FROM public.ss_tickets t
    WHERE t.id = ticket_id AND t.customer_id = public.ss_my_customer_id()
  )
);

CREATE POLICY "Reply on visible tickets"
ON public.ss_ticket_messages FOR INSERT TO authenticated
WITH CHECK (
  public.ss_is_staff()
  OR EXISTS (
    SELECT 1 FROM public.ss_tickets t
    WHERE t.id = ticket_id AND t.customer_id = public.ss_my_customer_id()
  )
);

CREATE TRIGGER ss_tickets_updated
BEFORE UPDATE ON public.ss_tickets
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();