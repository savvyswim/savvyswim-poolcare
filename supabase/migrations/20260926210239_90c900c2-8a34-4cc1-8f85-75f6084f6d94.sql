CREATE TABLE IF NOT EXISTS public.ss_internal_tasks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lead_id uuid,
    customer_id uuid,
    title text NOT NULL,
    details text,
    due_at timestamp with time zone,
    priority text DEFAULT 'normal'::text NOT NULL,
    status text DEFAULT 'open'::text NOT NULL,
    assigned_to uuid,
    completed_at timestamp with time zone,
    created_by uuid,
    created_by_name text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    escalation_level integer DEFAULT 0 NOT NULL,
    last_escalated_at timestamp with time zone,
    escalated_from uuid
);
CREATE TABLE IF NOT EXISTS public.ss_invoice_reconciliation (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    invoice_id uuid NOT NULL,
    crm_total numeric DEFAULT 0 NOT NULL,
    stripe_amount numeric,
    currency text DEFAULT 'usd'::text NOT NULL,
    stripe_session_id text,
    difference numeric DEFAULT 0 NOT NULL,
    state text DEFAULT 'unlinked'::text NOT NULL,
    note text,
    acknowledged_by uuid,
    acknowledged_at timestamp with time zone,
    checked_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public.ss_lead_appointments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lead_id uuid NOT NULL,
    customer_id uuid,
    starts_at timestamp with time zone NOT NULL,
    ends_at timestamp with time zone NOT NULL,
    assigned_staff_id uuid,
    kind text DEFAULT 'inspection'::text NOT NULL,
    status text DEFAULT 'scheduled'::text NOT NULL,
    location text,
    notes text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public.ss_native_push_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    token text NOT NULL,
    platform text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ss_native_push_tokens_platform_check CHECK ((platform = ANY (ARRAY['ios'::text, 'android'::text])))
);
CREATE TABLE IF NOT EXISTS public.ss_notification_prefs (
    user_id uuid NOT NULL,
    role_change_in_app boolean DEFAULT true NOT NULL,
    role_change_email boolean DEFAULT true NOT NULL,
    role_change_sms boolean DEFAULT false NOT NULL,
    account_in_app boolean DEFAULT true NOT NULL,
    account_email boolean DEFAULT true NOT NULL,
    account_sms boolean DEFAULT false NOT NULL,
    lead_sla_in_app boolean DEFAULT true NOT NULL,
    lead_sla_email boolean DEFAULT false NOT NULL,
    lead_sla_sms boolean DEFAULT false NOT NULL,
    sms_number text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    visit_in_app boolean DEFAULT true NOT NULL,
    visit_email boolean DEFAULT true NOT NULL,
    visit_sms boolean DEFAULT true NOT NULL,
    visit_push boolean DEFAULT true NOT NULL,
    role_change_push boolean DEFAULT false NOT NULL,
    account_push boolean DEFAULT false NOT NULL,
    lead_sla_push boolean DEFAULT false NOT NULL
);
CREATE TABLE IF NOT EXISTS public.ss_notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    kind text DEFAULT 'account'::text NOT NULL,
    title text NOT NULL,
    body text,
    link text,
    read_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public.ss_payment_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    customer_id uuid,
    invoice_id uuid,
    kind text NOT NULL,
    status text,
    amount numeric(10,2),
    method text,
    stripe_event_id text,
    stripe_session_id text,
    webhook_ok boolean,
    error_message text,
    detail jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    currency text DEFAULT 'usd'::text NOT NULL,
    stripe_amount numeric(10,2)
);
ALTER TABLE ONLY public.ss_payment_events REPLICA IDENTITY FULL;
COMMENT ON COLUMN public.ss_payment_events.currency IS 'ISO currency code reported by Stripe for this event.';
COMMENT ON COLUMN public.ss_payment_events.stripe_amount IS 'Exact total Stripe confirmed, in the major unit of currency.';
CREATE TABLE IF NOT EXISTS public.ss_payment_pickups (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    visit_id uuid,
    customer_id uuid NOT NULL,
    method text DEFAULT 'check'::text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    photo_path text,
    tech_note text,
    collected_by uuid,
    collected_at timestamp with time zone,
    admin_confirmed_at timestamp with time zone,
    admin_note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    scheduled_for date,
    assigned_tech_id uuid,
    pickup_address text,
    office_note text,
    created_by uuid,
    requested_by_customer boolean DEFAULT false NOT NULL,
    customer_note text,
    collected_amount numeric,
    CONSTRAINT ss_payment_pickups_method_chk CHECK ((method = ANY (ARRAY['check'::text, 'cash'::text, 'zelle'::text]))),
    CONSTRAINT ss_payment_pickups_status_chk CHECK ((status = ANY (ARRAY['requested'::text, 'pending'::text, 'collected'::text, 'not_left'::text, 'confirmed'::text, 'missing'::text])))
);
CREATE TABLE IF NOT EXISTS public.ss_payment_proofs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    invoice_id uuid NOT NULL,
    customer_id uuid NOT NULL,
    method text NOT NULL,
    image_path text NOT NULL,
    note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ss_payment_proofs_method_check CHECK ((method = ANY (ARRAY['check'::text, 'zelle'::text])))
);
CREATE TABLE IF NOT EXISTS public.ss_phone_optouts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    phone text NOT NULL,
    keyword text,
    opted_out_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public.ss_pool_costs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    customer_id uuid NOT NULL,
    visits_per_month numeric DEFAULT 4.33 NOT NULL,
    tech_pay_per_visit numeric,
    chem_cost_per_visit numeric DEFAULT 11 NOT NULL,
    chem_supplied_by_customer boolean DEFAULT false NOT NULL,
    extra_lines jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    target_margin_pct numeric
);
CREATE TABLE IF NOT EXISTS public.ss_pricing_settings (
    key text NOT NULL,
    value jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public.ss_push_subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    endpoint text NOT NULL,
    p256dh text NOT NULL,
    auth text NOT NULL,
    user_agent text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public.ss_qr_batches (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    batch_number integer NOT NULL,
    size integer NOT NULL,
    format text DEFAULT 'avery5160'::text NOT NULL,
    first_tag text NOT NULL,
    last_tag text NOT NULL,
    created_by uuid,
    note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public.ss_qr_scans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tag_id text NOT NULL,
    customer_id uuid,
    visit_id uuid,
    staff_id uuid,
    scanned_at timestamp with time zone DEFAULT now() NOT NULL,
    lat numeric,
    lng numeric,
    accuracy_m numeric,
    distance_ft numeric,
    outcome text DEFAULT 'ok'::text NOT NULL,
    user_agent text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    input_source text DEFAULT 'qr'::text NOT NULL,
    CONSTRAINT ss_qr_scans_input_source_check CHECK ((input_source = ANY (ARRAY['qr'::text, 'typed_number'::text])))
);
CREATE TABLE IF NOT EXISTS public.ss_qr_tags (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tag_id text NOT NULL,
    customer_id uuid,
    status text DEFAULT 'printed'::text NOT NULL,
    linked_by uuid,
    linked_at timestamp with time zone,
    first_scanned_at timestamp with time zone,
    last_scanned_at timestamp with time zone,
    note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    qr_url text,
    batch_id uuid,
    printed_at timestamp with time zone,
    created_by uuid,
    disabled_at timestamp with time zone,
    disabled_reason text,
    replaced_by_tag text,
    service_address_id uuid,
    water_body_id uuid,
    CONSTRAINT ss_qr_tags_status_check CHECK ((status = ANY (ARRAY['printed'::text, 'assigned'::text, 'disabled'::text])))
);
CREATE TABLE IF NOT EXISTS public.ss_quote_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    plan_id text NOT NULL,
    chem_included boolean DEFAULT false NOT NULL,
    lines jsonb DEFAULT '[]'::jsonb NOT NULL,
    defaults jsonb DEFAULT '{}'::jsonb NOT NULL,
    is_default boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 100 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public.ss_report_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    customer_id uuid,
    visit_id uuid,
    actor_user_id uuid,
    actor_role text DEFAULT 'customer'::text NOT NULL,
    kind text DEFAULT 'visit'::text NOT NULL,
    action text NOT NULL,
    status text DEFAULT 'success'::text NOT NULL,
    attempt integer DEFAULT 1 NOT NULL,
    error text,
    recipient text,
    filename text,
    bytes integer,
    property_label text,
    date_label text,
    meta jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public.ss_sla_alerts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    task_id uuid,
    user_id uuid,
    channel text NOT NULL,
    template_key text NOT NULL,
    recipient text,
    subject text,
    body text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    error text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    sent_at timestamp with time zone,
    CONSTRAINT ss_sla_alerts_channel_check CHECK ((channel = ANY (ARRAY['email'::text, 'sms'::text]))),
    CONSTRAINT ss_sla_alerts_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'sent'::text, 'failed'::text, 'skipped'::text])))
);