CREATE TABLE IF NOT EXISTS public.ss_sla_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    scope text NOT NULL,
    lead_id uuid,
    customer_id uuid,
    label text,
    enabled boolean DEFAULT true NOT NULL,
    warn_hours numeric,
    escalate_hours numeric,
    reassign_hours numeric,
    fallback_user_id uuid,
    notify_office boolean,
    channels jsonb DEFAULT '{"sms": false, "email": false, "in_app": true}'::jsonb NOT NULL,
    notes text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ss_sla_rules_scope_check CHECK ((scope = ANY (ARRAY['lead'::text, 'customer'::text]))),
    CONSTRAINT ss_sla_rules_target CHECK ((((scope = 'lead'::text) AND (lead_id IS NOT NULL) AND (customer_id IS NULL)) OR ((scope = 'customer'::text) AND (customer_id IS NOT NULL) AND (lead_id IS NULL))))
);
CREATE TABLE IF NOT EXISTS public.ss_sla_templates (
    key text NOT NULL,
    display_name text NOT NULL,
    title_tpl text NOT NULL,
    body_tpl text NOT NULL,
    channels jsonb DEFAULT '{"sms": false, "email": false, "in_app": true}'::jsonb NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public.ss_staff_availability (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tech_id uuid NOT NULL,
    weekday smallint NOT NULL,
    start_time time without time zone DEFAULT '08:00:00'::time without time zone NOT NULL,
    end_time time without time zone DEFAULT '17:00:00'::time without time zone NOT NULL,
    window_minutes integer DEFAULT 120 NOT NULL,
    max_stops integer,
    effective_from date,
    effective_to date,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ss_staff_availability_weekday_check CHECK (((weekday >= 0) AND (weekday <= 6))),
    CONSTRAINT ss_staff_availability_window_minutes_check CHECK (((window_minutes >= 30) AND (window_minutes <= 480)))
);
CREATE TABLE IF NOT EXISTS public.ss_staff_time_off (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tech_id uuid NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public.ss_task_audit (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    batch_id uuid NOT NULL,
    task_id uuid NOT NULL,
    lead_id uuid,
    customer_id uuid,
    action text NOT NULL,
    source text DEFAULT 'bulk_update_tasks'::text NOT NULL,
    actor_id uuid,
    actor_name text,
    changed_fields text[] DEFAULT '{}'::text[] NOT NULL,
    before jsonb DEFAULT '{}'::jsonb NOT NULL,
    after jsonb DEFAULT '{}'::jsonb NOT NULL,
    filters jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public.ss_truck_stock (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    truck_id uuid NOT NULL,
    item_id uuid NOT NULL,
    quantity numeric DEFAULT 0 NOT NULL,
    low_threshold numeric DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public.ss_vault_logins (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    url text,
    username text,
    secret_cipher text,
    account_number text,
    category text DEFAULT 'Supplies'::text NOT NULL,
    vendor_id uuid,
    notes text,
    updated_by uuid,
    updated_by_name text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public.ss_vendors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    contact_name text,
    phone text,
    email text,
    website text,
    address text,
    account_number text,
    supplies text,
    notes text,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public.ss_visit_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    customer_id uuid NOT NULL,
    requested_date date NOT NULL,
    window_start time without time zone,
    window_end time without time zone,
    reason text,
    note text,
    status text DEFAULT 'pending'::text NOT NULL,
    quoted_price numeric,
    office_note text,
    visit_id uuid,
    decided_by uuid,
    decided_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ss_visit_requests_status_chk CHECK ((status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'declined'::text])))
);
CREATE TABLE IF NOT EXISTS public.ss_webhook_secret_usage (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    key_used text NOT NULL,
    endpoint text NOT NULL,
    caller_origin text,
    hit_count integer DEFAULT 0 NOT NULL,
    last_used_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ss_webhook_secret_usage_key_used_check CHECK ((key_used = ANY (ARRAY['current'::text, 'previous'::text])))
);
DO $mig$
DECLARE s text;
BEGIN
  FOREACH s IN ARRAY ARRAY[
    'ALTER TABLE ONLY public.ss_access_attempts ADD CONSTRAINT ss_access_attempts_pkey PRIMARY KEY (id)',
    'ALTER TABLE ONLY public.ss_access_codes ADD CONSTRAINT ss_access_codes_code_key UNIQUE (code)',
    'ALTER TABLE ONLY public.ss_access_codes ADD CONSTRAINT ss_access_codes_pkey PRIMARY KEY (id)',
    'ALTER TABLE ONLY public.ss_access_requests ADD CONSTRAINT ss_access_requests_pkey PRIMARY KEY (id)',
    'ALTER TABLE ONLY public.ss_backup_sync ADD CONSTRAINT ss_backup_sync_entity_record_id_key UNIQUE (entity, record_id)',
    'ALTER TABLE ONLY public.ss_backup_sync ADD CONSTRAINT ss_backup_sync_pkey PRIMARY KEY (id)',
    'ALTER TABLE ONLY public.ss_bank_details ADD CONSTRAINT ss_bank_details_pkey PRIMARY KEY (id)',
    'ALTER TABLE ONLY public.ss_calls ADD CONSTRAINT ss_calls_call_sid_key UNIQUE (call_sid)',
    'ALTER TABLE ONLY public.ss_calls ADD CONSTRAINT ss_calls_pkey PRIMARY KEY (id)',
    'ALTER TABLE ONLY public.ss_catalog_sync_log ADD CONSTRAINT ss_catalog_sync_log_pkey PRIMARY KEY (id)',
    'ALTER TABLE ONLY public.ss_chat_channels ADD CONSTRAINT ss_chat_channels_pkey PRIMARY KEY (id)',
    'ALTER TABLE ONLY public.ss_chat_messages ADD CONSTRAINT ss_chat_messages_pkey PRIMARY KEY (id)',
    'ALTER TABLE ONLY public.ss_check_payments ADD CONSTRAINT ss_check_payments_pkey PRIMARY KEY (id)',
    'ALTER TABLE ONLY public.ss_email_attachments ADD CONSTRAINT ss_email_attachments_pkey PRIMARY KEY (id)',
    'ALTER TABLE ONLY public.ss_email_campaign_recipients ADD CONSTRAINT ss_email_campaign_recipients_pkey PRIMARY KEY (id)',
    'ALTER TABLE ONLY public.ss_email_campaigns ADD CONSTRAINT ss_email_campaigns_pkey PRIMARY KEY (id)',
    'ALTER TABLE ONLY public.ss_email_messages ADD CONSTRAINT ss_email_messages_pkey PRIMARY KEY (id)',
    'ALTER TABLE ONLY public.ss_email_templates ADD CONSTRAINT ss_email_templates_pkey PRIMARY KEY (id)',
    'ALTER TABLE ONLY public.ss_email_threads ADD CONSTRAINT ss_email_threads_pkey PRIMARY KEY (id)',
    'ALTER TABLE ONLY public.ss_internal_notes ADD CONSTRAINT ss_internal_notes_pkey PRIMARY KEY (id)',
    'ALTER TABLE ONLY public.ss_internal_tasks ADD CONSTRAINT ss_internal_tasks_pkey PRIMARY KEY (id)',
    'ALTER TABLE ONLY public.ss_invoice_reconciliation ADD CONSTRAINT ss_invoice_reconciliation_invoice_id_key UNIQUE (invoice_id)',
    'ALTER TABLE ONLY public.ss_invoice_reconciliation ADD CONSTRAINT ss_invoice_reconciliation_pkey PRIMARY KEY (id)',
    'ALTER TABLE ONLY public.ss_lead_appointments ADD CONSTRAINT ss_lead_appointments_pkey PRIMARY KEY (id)',
    'ALTER TABLE ONLY public.ss_native_push_tokens ADD CONSTRAINT ss_native_push_tokens_pkey PRIMARY KEY (id)',
    'ALTER TABLE ONLY public.ss_native_push_tokens ADD CONSTRAINT ss_native_push_tokens_user_id_token_key UNIQUE (user_id, token)',
    'ALTER TABLE ONLY public.ss_notification_prefs ADD CONSTRAINT ss_notification_prefs_pkey PRIMARY KEY (user_id)',
    'ALTER TABLE ONLY public.ss_notifications ADD CONSTRAINT ss_notifications_pkey PRIMARY KEY (id)',
    'ALTER TABLE ONLY public.ss_payment_events ADD CONSTRAINT ss_payment_events_pkey PRIMARY KEY (id)',
    'ALTER TABLE ONLY public.ss_payment_pickups ADD CONSTRAINT ss_payment_pickups_pkey PRIMARY KEY (id)',
    'ALTER TABLE ONLY public.ss_payment_pickups ADD CONSTRAINT ss_payment_pickups_visit_uniq UNIQUE (visit_id)',
    'ALTER TABLE ONLY public.ss_payment_proofs ADD CONSTRAINT ss_payment_proofs_pkey PRIMARY KEY (id)',
    'ALTER TABLE ONLY public.ss_phone_optouts ADD CONSTRAINT ss_phone_optouts_phone_key UNIQUE (phone)'
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