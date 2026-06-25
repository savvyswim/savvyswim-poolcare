UPDATE storage.objects
SET metadata = jsonb_set(metadata, '{mimetype}', '"video/mp4"')
WHERE bucket_id = 'pool-designs' AND name LIKE 'construction/%.mp4';