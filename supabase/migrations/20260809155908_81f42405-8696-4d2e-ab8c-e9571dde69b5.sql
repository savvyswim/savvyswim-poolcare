CREATE POLICY "Office staff can view contact events"
ON public.contact_events
FOR SELECT
TO authenticated
USING (public.ss_is_office());