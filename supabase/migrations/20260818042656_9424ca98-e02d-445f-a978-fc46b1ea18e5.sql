CREATE POLICY "Staff can update inspection requests"
ON public.inspection_requests
FOR UPDATE
TO authenticated
USING (
  public.ss_is_staff() OR EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::app_role
  )
)
WITH CHECK (
  public.ss_is_staff() OR EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::app_role
  )
);