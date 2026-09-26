DO $mig$
DECLARE s text;
BEGIN
  FOREACH s IN ARRAY ARRAY[
    'ALTER TABLE ONLY public.ss_phone_optouts ADD CONSTRAINT ss_phone_optouts_pkey PRIMARY KEY (id)',
    'ALTER TABLE ONLY public.ss_pool_costs ADD CONSTRAINT ss_pool_costs_customer_id_key UNIQUE (customer_id)',
    'ALTER TABLE ONLY public.ss_pool_costs ADD CONSTRAINT ss_pool_costs_pkey PRIMARY KEY (id)',
    'ALTER TABLE ONLY public.ss_pricing_settings ADD CONSTRAINT ss_pricing_settings_pkey PRIMARY KEY (key)',
    'ALTER TABLE ONLY public.ss_push_subscriptions ADD CONSTRAINT ss_push_subscriptions_endpoint_key UNIQUE (endpoint)',
    'ALTER TABLE ONLY public.ss_push_subscriptions ADD CONSTRAINT ss_push_subscriptions_pkey PRIMARY KEY (id)',
    'ALTER TABLE ONLY public.ss_qr_batches ADD CONSTRAINT ss_qr_batches_pkey PRIMARY KEY (id)',
    'ALTER TABLE ONLY public.ss_qr_scans ADD CONSTRAINT ss_qr_scans_pkey PRIMARY KEY (id)',
    'ALTER TABLE ONLY public.ss_qr_tags ADD CONSTRAINT ss_qr_tags_pkey PRIMARY KEY (id)',
    'ALTER TABLE ONLY public.ss_qr_tags ADD CONSTRAINT ss_qr_tags_tag_id_key UNIQUE (tag_id)',
    'ALTER TABLE ONLY public.ss_quote_templates ADD CONSTRAINT ss_quote_templates_pkey PRIMARY KEY (id)',
    'ALTER TABLE ONLY public.ss_quote_templates ADD CONSTRAINT ss_quote_templates_slug_key UNIQUE (slug)',
    'ALTER TABLE ONLY public.ss_report_events ADD CONSTRAINT ss_report_events_pkey PRIMARY KEY (id)',
    'ALTER TABLE ONLY public.ss_sla_alerts ADD CONSTRAINT ss_sla_alerts_pkey PRIMARY KEY (id)',
    'ALTER TABLE ONLY public.ss_sla_rules ADD CONSTRAINT ss_sla_rules_pkey PRIMARY KEY (id)',
    'ALTER TABLE ONLY public.ss_sla_templates ADD CONSTRAINT ss_sla_templates_pkey PRIMARY KEY (key)',
    'ALTER TABLE ONLY public.ss_staff_availability ADD CONSTRAINT ss_staff_availability_pkey PRIMARY KEY (id)',
    'ALTER TABLE ONLY public.ss_staff_availability ADD CONSTRAINT ss_staff_availability_tech_id_weekday_key UNIQUE (tech_id, weekday)',
    'ALTER TABLE ONLY public.ss_staff_time_off ADD CONSTRAINT ss_staff_time_off_pkey PRIMARY KEY (id)',
    'ALTER TABLE ONLY public.ss_task_audit ADD CONSTRAINT ss_task_audit_pkey PRIMARY KEY (id)',
    'ALTER TABLE ONLY public.ss_truck_stock ADD CONSTRAINT ss_truck_stock_pkey PRIMARY KEY (id)',
    'ALTER TABLE ONLY public.ss_truck_stock ADD CONSTRAINT ss_truck_stock_truck_id_item_id_key UNIQUE (truck_id, item_id)',
    'ALTER TABLE ONLY public.ss_vault_logins ADD CONSTRAINT ss_vault_logins_pkey PRIMARY KEY (id)',
    'ALTER TABLE ONLY public.ss_vendors ADD CONSTRAINT ss_vendors_pkey PRIMARY KEY (id)',
    'ALTER TABLE ONLY public.ss_visit_requests ADD CONSTRAINT ss_visit_requests_pkey PRIMARY KEY (id)',
    'ALTER TABLE ONLY public.ss_webhook_secret_usage ADD CONSTRAINT ss_webhook_secret_usage_key_used_endpoint_key UNIQUE (key_used, endpoint)',
    'ALTER TABLE ONLY public.ss_webhook_secret_usage ADD CONSTRAINT ss_webhook_secret_usage_pkey PRIMARY KEY (id)'
  ]
  LOOP
    BEGIN
      EXECUTE s;
    EXCEPTION WHEN duplicate_table OR duplicate_object OR invalid_table_definition THEN
      NULL;
    END;
  END LOOP;
END
$mig$;
CREATE INDEX IF NOT EXISTS idx_ss_invoice_recon_state ON public.ss_invoice_reconciliation USING btree (state);
CREATE INDEX IF NOT EXISTS ss_access_attempts_code_idx ON public.ss_access_attempts USING btree (code_norm, created_at DESC);
CREATE INDEX IF NOT EXISTS ss_access_attempts_user_idx ON public.ss_access_attempts USING btree (user_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS ss_access_codes_norm_uidx ON public.ss_access_codes USING btree (upper(regexp_replace(code, '[^A-Za-z0-9]'::text, ''::text, 'g'::text)));
CREATE INDEX IF NOT EXISTS ss_backup_sync_dirty_idx ON public.ss_backup_sync USING btree (entity, dirty) WHERE dirty;
CREATE INDEX IF NOT EXISTS ss_calls_created_idx ON public.ss_calls USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS ss_catalog_sync_log_ran_at_idx ON public.ss_catalog_sync_log USING btree (ran_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS ss_chat_channels_customer_uniq ON public.ss_chat_channels USING btree (customer_id) WHERE (customer_id IS NOT NULL);
CREATE INDEX IF NOT EXISTS ss_chat_messages_channel_idx ON public.ss_chat_messages USING btree (channel_id, created_at);
CREATE INDEX IF NOT EXISTS ss_email_attachments_message_idx ON public.ss_email_attachments USING btree (message_id);
CREATE INDEX IF NOT EXISTS ss_email_campaign_recipients_campaign_idx ON public.ss_email_campaign_recipients USING btree (campaign_id, status);
CREATE INDEX IF NOT EXISTS ss_email_campaign_recipients_lead_idx ON public.ss_email_campaign_recipients USING btree (lead_id);
CREATE INDEX IF NOT EXISTS ss_email_campaigns_status_idx ON public.ss_email_campaigns USING btree (status, scheduled_at);
CREATE UNIQUE INDEX IF NOT EXISTS ss_email_messages_message_id_idx ON public.ss_email_messages USING btree (message_id) WHERE (message_id IS NOT NULL);
CREATE INDEX IF NOT EXISTS ss_email_messages_thread_idx ON public.ss_email_messages USING btree (thread_id, created_at);
CREATE INDEX IF NOT EXISTS ss_email_templates_default_idx ON public.ss_email_templates USING btree (is_default);
CREATE INDEX IF NOT EXISTS ss_email_threads_participant_idx ON public.ss_email_threads USING btree (lower(participant_email));
CREATE INDEX IF NOT EXISTS ss_email_threads_recent_idx ON public.ss_email_threads USING btree (last_message_at DESC);
CREATE INDEX IF NOT EXISTS ss_internal_notes_customer_idx ON public.ss_internal_notes USING btree (customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ss_internal_notes_lead_idx ON public.ss_internal_notes USING btree (lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ss_internal_tasks_customer_idx ON public.ss_internal_tasks USING btree (customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ss_internal_tasks_lead_idx ON public.ss_internal_tasks USING btree (lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ss_internal_tasks_overdue_idx ON public.ss_internal_tasks USING btree (status, due_at) WHERE (status = 'open'::text);
CREATE INDEX IF NOT EXISTS ss_lead_appointments_lead_idx ON public.ss_lead_appointments USING btree (lead_id);
CREATE INDEX IF NOT EXISTS ss_lead_appointments_starts_idx ON public.ss_lead_appointments USING btree (starts_at);
CREATE INDEX IF NOT EXISTS ss_notifications_user_idx ON public.ss_notifications USING btree (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ss_payment_events_customer_idx ON public.ss_payment_events USING btree (customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ss_payment_events_invoice_idx ON public.ss_payment_events USING btree (invoice_id);
CREATE INDEX IF NOT EXISTS ss_payment_pickups_customer_idx ON public.ss_payment_pickups USING btree (customer_id, scheduled_for);
CREATE INDEX IF NOT EXISTS ss_payment_pickups_sched_idx ON public.ss_payment_pickups USING btree (scheduled_for, assigned_tech_id);
CREATE UNIQUE INDEX IF NOT EXISTS ss_qr_batches_number_key ON public.ss_qr_batches USING btree (batch_number);
CREATE INDEX IF NOT EXISTS ss_qr_scans_input_source_idx ON public.ss_qr_scans USING btree (input_source, scanned_at DESC);
CREATE INDEX IF NOT EXISTS ss_qr_scans_outcome_idx ON public.ss_qr_scans USING btree (outcome, scanned_at DESC);
CREATE INDEX IF NOT EXISTS ss_qr_scans_staff_idx ON public.ss_qr_scans USING btree (staff_id, scanned_at DESC);
CREATE INDEX IF NOT EXISTS ss_qr_scans_tag_idx ON public.ss_qr_scans USING btree (tag_id, scanned_at DESC);
CREATE INDEX IF NOT EXISTS ss_qr_tags_batch_idx ON public.ss_qr_tags USING btree (batch_id);
CREATE INDEX IF NOT EXISTS ss_qr_tags_customer_idx ON public.ss_qr_tags USING btree (customer_id);
CREATE INDEX IF NOT EXISTS ss_qr_tags_status_idx ON public.ss_qr_tags USING btree (status, last_scanned_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS ss_quote_templates_one_default_per_plan ON public.ss_quote_templates USING btree (plan_id) WHERE (is_default AND is_active);
CREATE INDEX IF NOT EXISTS ss_report_events_created_idx ON public.ss_report_events USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS ss_report_events_customer_idx ON public.ss_report_events USING btree (customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ss_sla_alerts_pending_idx ON public.ss_sla_alerts USING btree (status, created_at) WHERE (status = 'pending'::text);
CREATE UNIQUE INDEX IF NOT EXISTS ss_sla_rules_customer_uniq ON public.ss_sla_rules USING btree (customer_id) WHERE (customer_id IS NOT NULL);
CREATE UNIQUE INDEX IF NOT EXISTS ss_sla_rules_lead_uniq ON public.ss_sla_rules USING btree (lead_id) WHERE (lead_id IS NOT NULL);
CREATE INDEX IF NOT EXISTS ss_task_audit_batch_idx ON public.ss_task_audit USING btree (batch_id);
CREATE INDEX IF NOT EXISTS ss_task_audit_created_idx ON public.ss_task_audit USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS ss_task_audit_task_idx ON public.ss_task_audit USING btree (task_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ss_vault_logins_name_idx ON public.ss_vault_logins USING btree (name);
CREATE INDEX IF NOT EXISTS ss_visit_requests_customer_idx ON public.ss_visit_requests USING btree (customer_id, created_at DESC);