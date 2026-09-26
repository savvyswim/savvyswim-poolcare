SET check_function_bodies = off;
CREATE OR REPLACE FUNCTION public.ss_visit_parts(p_visit_id uuid)
 RETURNS TABLE(item_name text, qty numeric, unit text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT m.item_name,
         COALESCE(m.entered_qty, abs(m.delta))::numeric AS qty,
         COALESCE(m.entered_unit, 'ea')::text AS unit
  FROM public.ss_inventory_moves m
  JOIN public.ss_visits v ON v.id = m.visit_id
  WHERE m.visit_id = p_visit_id
    AND m.delta < 0
    AND (
      public.ss_is_staff()
      OR v.customer_id IN (SELECT public.ss_my_customer_ids())
    )
  ORDER BY m.created_at
$function$
;
CREATE OR REPLACE FUNCTION public.update_ss_native_push_tokens_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
;
-- Tables from the SavvySwim app
CREATE TABLE IF NOT EXISTS public.ss_access_attempts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    code_norm text NOT NULL,
    success boolean DEFAULT false NOT NULL,
    reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public.ss_access_codes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    customer_id uuid,
    full_name text,
    email text,
    phone text,
    address text,
    city text,
    state text,
    postal_code text,
    note text,
    status text DEFAULT 'active'::text NOT NULL,
    expires_at timestamp with time zone,
    created_by uuid,
    redeemed_by uuid,
    redeemed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    last_send_ok boolean,
    last_send_error text,
    last_send_email boolean,
    last_send_sms boolean
);
CREATE TABLE IF NOT EXISTS public.ss_access_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    email text,
    full_name text,
    phone text,
    address text NOT NULL,
    city text,
    state text,
    postal_code text,
    note text,
    status text DEFAULT 'pending'::text NOT NULL,
    reviewed_by uuid,
    reviewed_at timestamp with time zone,
    customer_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public.ss_backup_sync (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    entity text NOT NULL,
    record_id uuid NOT NULL,
    row_index integer,
    dirty boolean DEFAULT true NOT NULL,
    synced_at timestamp with time zone,
    last_error text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ss_backup_sync_entity_check CHECK ((entity = ANY (ARRAY['lead'::text, 'payment'::text])))
);
CREATE TABLE IF NOT EXISTS public.ss_bank_details (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    payee_name text DEFAULT 'Savvy Swim Pool Service'::text NOT NULL,
    mail_line1 text,
    mail_line2 text,
    mail_city text,
    mail_state text,
    mail_postal text,
    bank_name text,
    account_holder text,
    routing_number text,
    account_number text,
    ach_instructions text,
    memo_instructions text,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public.ss_calls (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    call_sid text,
    direction text DEFAULT 'inbound'::text NOT NULL,
    from_number text,
    to_number text,
    customer_id uuid,
    status text DEFAULT 'ringing'::text NOT NULL,
    outcome text,
    duration_seconds integer,
    recording_url text,
    transcript text,
    caller_city text,
    caller_state text,
    is_test boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public.ss_catalog_sync_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ran_at timestamp with time zone DEFAULT now() NOT NULL,
    actor_id uuid,
    actor_name text,
    environment text DEFAULT 'live'::text NOT NULL,
    mode text DEFAULT 'dry_run'::text NOT NULL,
    created_count integer DEFAULT 0 NOT NULL,
    updated_count integer DEFAULT 0 NOT NULL,
    skipped_count integer DEFAULT 0 NOT NULL,
    error_count integer DEFAULT 0 NOT NULL,
    changes jsonb DEFAULT '[]'::jsonb NOT NULL,
    errors jsonb DEFAULT '[]'::jsonb NOT NULL
);
CREATE TABLE IF NOT EXISTS public.ss_chat_channels (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    kind text DEFAULT 'team'::text NOT NULL,
    customer_id uuid,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    last_message_at timestamp with time zone,
    last_preview text,
    CONSTRAINT ss_chat_channels_kind_chk CHECK ((kind = ANY (ARRAY['team'::text, 'customer'::text])))
);
CREATE TABLE IF NOT EXISTS public.ss_chat_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    channel_id uuid NOT NULL,
    author_id uuid,
    author_name text,
    author_kind text DEFAULT 'staff'::text NOT NULL,
    body text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public.ss_check_payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    invoice_id uuid,
    customer_id uuid,
    amount numeric DEFAULT 0 NOT NULL,
    check_number text,
    delivery text DEFAULT 'mail'::text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    note text,
    received_at timestamp with time zone,
    cleared_at timestamp with time zone,
    handled_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    posted_payment_id uuid
);
CREATE TABLE IF NOT EXISTS public.ss_email_attachments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    message_id uuid NOT NULL,
    filename text NOT NULL,
    content_type text,
    size_bytes integer,
    storage_path text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public.ss_email_campaign_recipients (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    campaign_id uuid NOT NULL,
    lead_id uuid,
    email text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    sent_at timestamp with time zone,
    error text,
    message_id text,
    opened_at timestamp with time zone,
    clicked_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public.ss_email_campaigns (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    template_id uuid,
    audience_type text DEFAULT 'open_leads'::text NOT NULL,
    audience_filters jsonb DEFAULT '{}'::jsonb NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    scheduled_at timestamp with time zone,
    sent_at timestamp with time zone,
    sent_by uuid,
    subject text NOT NULL,
    body_html text NOT NULL,
    body_text text NOT NULL,
    from_address text,
    reply_to text,
    stats jsonb DEFAULT '{"sent": 0, "total": 0, "failed": 0, "bounced": 0, "rejected": 0, "delivered": 0, "suppressed": 0, "rate_limited": 0}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public.ss_email_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    thread_id uuid NOT NULL,
    direction text NOT NULL,
    from_email text NOT NULL,
    from_name text,
    to_email text NOT NULL,
    subject text,
    body_text text,
    body_html text,
    message_id text,
    in_reply_to text,
    refs text,
    sent_by uuid,
    is_read boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    attachment_expected_count integer DEFAULT 0 NOT NULL,
    attachment_saved_count integer DEFAULT 0 NOT NULL,
    attachment_failure_summary text,
    CONSTRAINT ss_email_messages_direction_check CHECK ((direction = ANY (ARRAY['in'::text, 'out'::text])))
);
CREATE TABLE IF NOT EXISTS public.ss_email_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    subject text NOT NULL,
    body_html text NOT NULL,
    body_text text NOT NULL,
    merge_tags text[] DEFAULT '{}'::text[] NOT NULL,
    is_default boolean DEFAULT false NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public.ss_email_threads (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    customer_id uuid,
    participant_email text NOT NULL,
    participant_name text,
    subject text DEFAULT '(no subject)'::text NOT NULL,
    status text DEFAULT 'open'::text NOT NULL,
    assigned_to uuid,
    unread_count integer DEFAULT 0 NOT NULL,
    last_direction text DEFAULT 'in'::text NOT NULL,
    last_message_at timestamp with time zone DEFAULT now() NOT NULL,
    last_snippet text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ss_email_threads_last_direction_check CHECK ((last_direction = ANY (ARRAY['in'::text, 'out'::text]))),
    CONSTRAINT ss_email_threads_status_check CHECK ((status = ANY (ARRAY['open'::text, 'archived'::text])))
);
CREATE TABLE IF NOT EXISTS public.ss_internal_notes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lead_id uuid,
    customer_id uuid,
    body text NOT NULL,
    pinned boolean DEFAULT false NOT NULL,
    author_id uuid,
    author_name text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);