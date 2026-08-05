INSERT INTO public.ss_settings (key, value)
VALUES ('office_notification_emails', '["marcus@santanariveragroup.com"]'::jsonb)
ON CONFLICT (key) DO NOTHING;