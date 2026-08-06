CREATE POLICY "Staff upload review photos" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'review-photos' AND public.ss_is_staff());

CREATE POLICY "Staff read review photos" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'review-photos' AND public.ss_is_staff());

CREATE POLICY "Staff delete review photos" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'review-photos' AND public.ss_is_staff());