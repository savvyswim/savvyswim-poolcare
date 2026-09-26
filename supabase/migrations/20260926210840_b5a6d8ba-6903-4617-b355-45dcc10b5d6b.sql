DO $mig$
DECLARE s text;
BEGIN
  FOREACH s IN ARRAY ARRAY[
$q$CREATE POLICY "office update internal notes" ON public.ss_internal_notes FOR UPDATE TO authenticated USING (public.ss_is_office()) WITH CHECK (public.ss_is_office())$q$,
$q$CREATE POLICY "own attempts readable" ON public.ss_access_attempts FOR SELECT TO authenticated USING ((user_id = auth.uid()))$q$,
$q$CREATE POLICY "own push subscriptions" ON public.ss_push_subscriptions TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()))$q$,
$q$CREATE POLICY "owner manages pricing settings" ON public.ss_pricing_settings TO authenticated USING (public.ss_is_owner()) WITH CHECK (public.ss_is_owner())$q$,
$q$CREATE POLICY "pickups assigned tech read" ON public.ss_payment_pickups FOR SELECT TO authenticated USING (((assigned_tech_id IS NOT NULL) AND (assigned_tech_id = public.ss_my_staff_id())))$q$,
$q$CREATE POLICY "pickups assigned tech update" ON public.ss_payment_pickups FOR UPDATE TO authenticated USING (((assigned_tech_id IS NOT NULL) AND (assigned_tech_id = public.ss_my_staff_id()))) WITH CHECK (((assigned_tech_id IS NOT NULL) AND (assigned_tech_id = public.ss_my_staff_id())))$q$,
$q$CREATE POLICY "pickups customer cancel own request" ON public.ss_payment_pickups FOR DELETE TO authenticated USING (((customer_id IN ( SELECT public.ss_my_customer_ids() AS ss_my_customer_ids)) AND (requested_by_customer = true) AND (status = 'requested'::text)))$q$,
$q$CREATE POLICY "pickups customer read own" ON public.ss_payment_pickups FOR SELECT TO authenticated USING ((customer_id IN ( SELECT public.ss_my_customer_ids() AS ss_my_customer_ids)))$q$,
$q$CREATE POLICY "pickups customer request own" ON public.ss_payment_pickups FOR INSERT TO authenticated WITH CHECK (((customer_id IN ( SELECT public.ss_my_customer_ids() AS ss_my_customer_ids)) AND (visit_id IS NULL) AND (status = 'requested'::text) AND (requested_by_customer = true) AND (scheduled_for IS NOT NULL)))$q$,
$q$CREATE POLICY "pickups customer update own request" ON public.ss_payment_pickups FOR UPDATE TO authenticated USING (((customer_id IN ( SELECT public.ss_my_customer_ids() AS ss_my_customer_ids)) AND (requested_by_customer = true) AND (status = 'requested'::text))) WITH CHECK (((customer_id IN ( SELECT public.ss_my_customer_ids() AS ss_my_customer_ids)) AND (requested_by_customer = true) AND (status = 'requested'::text) AND (visit_id IS NULL)))$q$,
$q$CREATE POLICY "staff manage channels" ON public.ss_chat_channels TO authenticated USING (public.ss_is_staff()) WITH CHECK (public.ss_is_staff())$q$,
$q$CREATE POLICY "staff manage email campaigns" ON public.ss_email_campaigns TO authenticated USING (public.ss_is_staff()) WITH CHECK (public.ss_is_staff())$q$,
$q$CREATE POLICY "staff manage email recipients" ON public.ss_email_campaign_recipients TO authenticated USING (public.ss_is_staff()) WITH CHECK (public.ss_is_staff())$q$,
$q$CREATE POLICY "staff manage email templates" ON public.ss_email_templates TO authenticated USING (public.ss_is_staff()) WITH CHECK (public.ss_is_staff())$q$,
$q$CREATE POLICY "staff read catalog sync log" ON public.ss_catalog_sync_log FOR SELECT TO authenticated USING (public.ss_is_staff())$q$,
$q$CREATE POLICY "staff read crew hours" ON public.ss_staff_availability FOR SELECT TO authenticated USING (public.ss_is_staff())$q$,
$q$CREATE POLICY "staff read internal notes" ON public.ss_internal_notes FOR SELECT TO authenticated USING (public.ss_is_staff())$q$,
$q$CREATE POLICY "staff read internal tasks" ON public.ss_internal_tasks FOR SELECT TO authenticated USING (public.ss_is_staff())$q$,
$q$CREATE POLICY "staff read messages" ON public.ss_chat_messages FOR SELECT TO authenticated USING (public.ss_is_staff())$q$,
$q$CREATE POLICY "staff read task audit" ON public.ss_task_audit FOR SELECT TO authenticated USING (public.ss_is_staff())$q$,
$q$CREATE POLICY "staff read time off" ON public.ss_staff_time_off FOR SELECT TO authenticated USING (public.ss_is_staff())$q$,
$q$CREATE POLICY "staff read vendors" ON public.ss_vendors FOR SELECT TO authenticated USING (public.ss_is_staff())$q$,
$q$CREATE POLICY "staff read webhook secret usage" ON public.ss_webhook_secret_usage FOR SELECT TO authenticated USING (public.ss_is_staff())$q$,
$q$CREATE POLICY "staff update internal tasks" ON public.ss_internal_tasks FOR UPDATE TO authenticated USING (public.ss_is_staff()) WITH CHECK (public.ss_is_staff())$q$,
$q$CREATE POLICY "staff write catalog sync log" ON public.ss_catalog_sync_log FOR INSERT TO authenticated WITH CHECK (public.ss_is_staff())$q$,
$q$CREATE POLICY "staff write internal notes" ON public.ss_internal_notes FOR INSERT TO authenticated WITH CHECK ((public.ss_is_staff() AND ((lead_id IS NOT NULL) OR (customer_id IS NOT NULL)) AND ((length(body) >= 1) AND (length(body) <= 5000))))$q$,
$q$CREATE POLICY "staff write internal tasks" ON public.ss_internal_tasks FOR INSERT TO authenticated WITH CHECK ((public.ss_is_staff() AND ((lead_id IS NOT NULL) OR (customer_id IS NOT NULL)) AND ((length(title) >= 1) AND (length(title) <= 300))))$q$,
$q$CREATE POLICY "staff write messages" ON public.ss_chat_messages FOR INSERT TO authenticated WITH CHECK (public.ss_is_staff())$q$,
$q$CREATE POLICY "staff write task audit" ON public.ss_task_audit FOR INSERT TO authenticated WITH CHECK ((public.ss_is_staff() AND ((actor_id IS NULL) OR (actor_id = auth.uid()))))$q$
  ]
  LOOP
    BEGIN
      EXECUTE s;
    EXCEPTION WHEN duplicate_object THEN
      NULL;
    END;
  END LOOP;
END
$mig$;
ALTER TABLE public.ss_access_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ss_access_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ss_access_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ss_backup_sync ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ss_bank_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ss_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ss_catalog_sync_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ss_chat_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ss_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ss_check_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ss_email_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ss_email_campaign_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ss_email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ss_email_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ss_email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ss_email_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ss_internal_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ss_internal_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ss_invoice_reconciliation ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ss_lead_appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ss_native_push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ss_notification_prefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ss_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ss_payment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ss_payment_pickups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ss_payment_proofs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ss_phone_optouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ss_pool_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ss_pricing_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ss_push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ss_qr_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ss_qr_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ss_qr_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ss_quote_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ss_report_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ss_sla_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ss_sla_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ss_sla_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ss_staff_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ss_staff_time_off ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ss_task_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ss_truck_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ss_vault_logins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ss_vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ss_visit_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ss_webhook_secret_usage ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON TABLE public.ss_access_attempts TO authenticated;
GRANT ALL ON TABLE public.ss_access_attempts TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.ss_access_codes TO authenticated;
GRANT ALL ON TABLE public.ss_access_codes TO service_role;
GRANT SELECT,INSERT,UPDATE ON TABLE public.ss_access_requests TO authenticated;
GRANT ALL ON TABLE public.ss_access_requests TO service_role;
GRANT SELECT ON TABLE public.ss_backup_sync TO authenticated;
GRANT ALL ON TABLE public.ss_backup_sync TO service_role;
GRANT SELECT,INSERT,UPDATE ON TABLE public.ss_bank_details TO authenticated;
GRANT ALL ON TABLE public.ss_bank_details TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.ss_calls TO authenticated;
GRANT ALL ON TABLE public.ss_calls TO service_role;
GRANT SELECT,INSERT ON TABLE public.ss_catalog_sync_log TO authenticated;
GRANT ALL ON TABLE public.ss_catalog_sync_log TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.ss_chat_channels TO authenticated;
GRANT ALL ON TABLE public.ss_chat_channels TO service_role;
GRANT SELECT,INSERT ON TABLE public.ss_chat_messages TO authenticated;
GRANT ALL ON TABLE public.ss_chat_messages TO service_role;
GRANT SELECT,INSERT,UPDATE ON TABLE public.ss_check_payments TO authenticated;
GRANT ALL ON TABLE public.ss_check_payments TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.ss_email_attachments TO authenticated;
GRANT ALL ON TABLE public.ss_email_attachments TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.ss_email_campaign_recipients TO authenticated;
GRANT ALL ON TABLE public.ss_email_campaign_recipients TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.ss_email_campaigns TO authenticated;
GRANT ALL ON TABLE public.ss_email_campaigns TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.ss_email_messages TO authenticated;
GRANT ALL ON TABLE public.ss_email_messages TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.ss_email_templates TO authenticated;
GRANT ALL ON TABLE public.ss_email_templates TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.ss_email_threads TO authenticated;