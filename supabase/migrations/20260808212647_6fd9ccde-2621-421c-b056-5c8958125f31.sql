CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.unschedule('savvy-low-stock-watch') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'savvy-low-stock-watch');

SELECT cron.schedule(
  'savvy-low-stock-watch',
  '0 12 * * *',
  $$
  SELECT net.http_post(
    url := 'https://project--beff0d54-4ac3-49d5-8d2c-3d4520824e41.lovable.app/api/public/hooks/low-stock-watch',
    headers := '{"Content-Type": "application/json", "apikey": "sb_publishable_MVONxFSjmQlPVnC7K4SXAg_1M1DdZCF"}'::jsonb,
    body := '{"source":"cron"}'::jsonb
  );
  $$
);