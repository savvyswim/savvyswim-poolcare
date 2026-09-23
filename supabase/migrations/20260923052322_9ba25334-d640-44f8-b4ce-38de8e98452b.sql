-- lovable-cron-fallback-reviewed: failed website-to-app handoffs must be re-sent within about 15 minutes; no event source exists because the failure is an outbound HTTP error
select cron.schedule(
  'savvyswim-retry-crm-forwards',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := 'https://project--beff0d54-4ac3-49d5-8d2c-3d4520824e41.lovable.app/api/public/hooks/retry-crm-forwards?k=f9a951dee59f4f225b5ff9f82cf123178a64353ca819bf1c',
    headers := '{"Content-Type": "application/json", "apikey": "sb_publishable_MVONxFSjmQlPVnC7K4SXAg_1M1DdZCF"}'::jsonb,
    body := '{}'::jsonb
  ) as request_id;
  $$
);