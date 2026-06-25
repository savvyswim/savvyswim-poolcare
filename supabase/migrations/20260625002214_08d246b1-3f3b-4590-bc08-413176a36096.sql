
CREATE POLICY "Admins read pool design files" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'pool-designs' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins write pool design files" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'pool-designs' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update pool design files" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'pool-designs' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete pool design files" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'pool-designs' AND public.has_role(auth.uid(), 'admin'));
