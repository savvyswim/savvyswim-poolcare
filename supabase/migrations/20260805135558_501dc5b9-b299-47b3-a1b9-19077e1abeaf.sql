
CREATE POLICY "Office reads pool design files" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'pool-designs' AND public.ss_is_office());
CREATE POLICY "Office writes pool design files" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'pool-designs' AND public.ss_is_office());
CREATE POLICY "Office updates pool design files" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'pool-designs' AND public.ss_is_office());
CREATE POLICY "Office deletes pool design files" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'pool-designs' AND public.ss_is_office());
