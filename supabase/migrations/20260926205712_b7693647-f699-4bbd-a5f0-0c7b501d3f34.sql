SET check_function_bodies = off;
CREATE OR REPLACE FUNCTION public.ss_remit_info()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT jsonb_build_object(
    'payee_name', b.payee_name,
    'mail_line1', b.mail_line1,
    'mail_line2', b.mail_line2,
    'mail_city', b.mail_city,
    'mail_state', b.mail_state,
    'mail_postal', b.mail_postal,
    'memo_instructions', b.memo_instructions
  )
  FROM public.ss_bank_details b
  ORDER BY b.created_at
  LIMIT 1
$function$
;
CREATE OR REPLACE FUNCTION public.ss_request_cancellation(p_token text, p_reason text, p_note text DEFAULT NULL::text, p_preferred_date date DEFAULT NULL::date, p_ip text DEFAULT NULL::text, p_user_agent text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_contract record;
  v_existing record;
  v_effective date;
  v_ref text;
  v_id uuid;
  v_priority text;
BEGIN
  IF p_reason NOT IN ('moving','selling','diy','price','service_issue','other') THEN
    RAISE EXCEPTION 'invalid reason';
  END IF;

  SELECT c.id, c.customer_id, c.title, c.signed_at, c.voided_at, c.recipient_name
    INTO v_contract
  FROM public.ss_contracts c WHERE c.token = p_token LIMIT 1;

  IF v_contract.id IS NULL THEN
    RAISE EXCEPTION 'agreement not found';
  END IF;
  IF v_contract.voided_at IS NOT NULL THEN
    RAISE EXCEPTION 'this agreement is no longer active';
  END IF;

  SELECT r.id, r.reference, r.effective_date, r.status INTO v_existing
  FROM public.ss_cancellation_requests r
  WHERE r.contract_id = v_contract.id AND r.status = 'pending'
  LIMIT 1;

  IF v_existing.id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'reference', v_existing.reference,
      'effective_date', v_existing.effective_date,
      'status', v_existing.status,
      'duplicate', true
    );
  END IF;

  v_effective := greatest(current_date + 30, coalesce(p_preferred_date, current_date + 30));
  v_ref := 'CX-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));

  INSERT INTO public.ss_cancellation_requests (
    contract_id, customer_id, reference, reason, note, effective_date, ip, user_agent
  ) VALUES (
    v_contract.id, v_contract.customer_id, v_ref, p_reason,
    left(nullif(btrim(coalesce(p_note, '')), ''), 1000),
    v_effective, left(p_ip, 60), left(p_user_agent, 300)
  ) RETURNING id INTO v_id;

  INSERT INTO public.ss_contract_events (contract_id, event, detail, ip, user_agent)
  VALUES (v_contract.id, 'cancel_requested',
          format('%s, effective %s (%s)', v_ref, v_effective, p_reason),
          left(p_ip, 60), left(p_user_agent, 300));

  v_priority := CASE WHEN p_reason = 'service_issue' THEN 'high' ELSE 'normal' END;

  INSERT INTO public.ss_internal_tasks (customer_id, title, details, due_at, priority, created_by_name)
  VALUES (
    v_contract.customer_id,
    format('Cancellation requested, %s', coalesce(v_contract.recipient_name, 'customer')),
    format('Ref %s. Reason: %s. Effective %s.%s', v_ref, p_reason, v_effective,
           CASE WHEN coalesce(btrim(p_note), '') = '' THEN '' ELSE ' Note: ' || left(btrim(p_note), 500) END),
    (v_effective - 7)::timestamptz,
    v_priority,
    'Cancellation link'
  );

  IF v_contract.customer_id IS NOT NULL THEN
    INSERT INTO public.ss_alerts (customer_id, priority, title, body)
    VALUES (
      v_contract.customer_id,
      CASE WHEN p_reason = 'service_issue' THEN 'HIGH' ELSE 'MED' END,
      'Cancellation requested',
      format('Ref %s, service stops %s. Reason: %s.', v_ref, v_effective, p_reason)
    );
  END IF;

  RETURN jsonb_build_object(
    'reference', v_ref,
    'effective_date', v_effective,
    'status', 'pending',
    'duplicate', false
  );
END;
$function$
;
CREATE OR REPLACE FUNCTION public.ss_run_invoice_dunning()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_past int := 0;
  v_remind jsonb := '[]'::jsonb;
  v_held int := 0;
  r record;
BEGIN
  -- Day 0: anything unpaid past its due date is past due.
  UPDATE public.ss_invoices
     SET past_due_at = now(), updated_at = now()
   WHERE status IN ('not_paid', 'partial', 'open')
     AND due_date IS NOT NULL
     AND due_date < CURRENT_DATE
     AND past_due_at IS NULL;
  GET DIAGNOSTICS v_past = ROW_COUNT;

  -- Day 7: reminder worklist (the app sends the email and text).
  FOR r IN
    SELECT i.id, i.invoice_number, i.amount - i.amount_paid AS balance, i.due_date,
           cu.id AS customer_id, cu.full_name, cu.email, cu.phone
      FROM public.ss_invoices i
      JOIN public.ss_customers cu ON cu.id = i.customer_id
     WHERE i.status IN ('not_paid', 'partial', 'open')
       AND i.due_date IS NOT NULL
       AND i.due_date <= CURRENT_DATE - 7
       AND i.reminder_sent_at IS NULL
  LOOP
    v_remind := v_remind || jsonb_build_object(
      'invoice_id', r.id, 'invoice_number', r.invoice_number, 'balance', r.balance,
      'due_date', r.due_date, 'customer_id', r.customer_id, 'full_name', r.full_name,
      'email', r.email, 'phone', r.phone
    );
  END LOOP;

  -- Day 15: hold service until the balance is cleared.
  FOR r IN
    SELECT i.id, i.invoice_number, i.customer_id, cu.full_name
      FROM public.ss_invoices i
      JOIN public.ss_customers cu ON cu.id = i.customer_id
     WHERE i.status IN ('not_paid', 'partial', 'open')
       AND i.due_date IS NOT NULL
       AND i.due_date <= CURRENT_DATE - 15
       AND i.hold_at IS NULL
  LOOP
    UPDATE public.ss_invoices SET hold_at = now(), updated_at = now() WHERE id = r.id;
    UPDATE public.ss_customers
       SET service_hold_at = coalesce(service_hold_at, now()),
           service_hold_reason = 'Balance due on invoice ' || r.invoice_number
     WHERE id = r.customer_id;
    PERFORM public.ss_notify_office(
      'billing_hold',
      'Service hold, ' || r.full_name,
      'Invoice ' || r.invoice_number || ' is 15+ days past due. Upcoming visits are flagged do-not-service.',
      '/admin/crm/customers/' || r.customer_id
    );
    v_held := v_held + 1;
  END LOOP;

  RETURN jsonb_build_object('marked_past_due', v_past, 'reminders', v_remind, 'holds', v_held);
END;
$function$
;
CREATE OR REPLACE FUNCTION public.ss_run_lead_sla()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  cfg jsonb := public.ss_lead_sla_config();
  followup_hours int := COALESCE((cfg->>'followup_hours')::int, 24);
  max_reminders int := COALESCE((cfg->>'max_reminders')::int, 5);
  l public.ss_leads%ROWTYPE;
  owner_user uuid;
  sent int := 0;
  marked int := 0;
BEGIN
  FOR l IN
    SELECT * FROM public.ss_leads
    WHERE stage NOT IN ('won','lost')
      AND converted_customer_id IS NULL
      AND sla_due_at IS NOT NULL
  LOOP
    IF public.ss_lead_is_resolved(l) THEN
      IF l.sla_status <> 'met' THEN
        UPDATE public.ss_leads SET sla_status = 'met' WHERE id = l.id;
        marked := marked + 1;
      END IF;
      CONTINUE;
    END IF;

    IF now() < l.sla_due_at THEN
      IF l.sla_status <> 'on_track' THEN
        UPDATE public.ss_leads SET sla_status = 'on_track' WHERE id = l.id;
      END IF;
      CONTINUE;
    END IF;

    IF l.reminder_count >= max_reminders THEN
      UPDATE public.ss_leads SET sla_status = 'overdue' WHERE id = l.id;
      CONTINUE;
    END IF;
    IF l.last_reminder_at IS NOT NULL
       AND now() < l.last_reminder_at + make_interval(hours => followup_hours) THEN
      CONTINUE;
    END IF;

    SELECT s.user_id INTO owner_user
    FROM public.ss_staff s WHERE s.id = l.assigned_staff_id AND s.is_active;

    IF owner_user IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.ss_notification_prefs p
      WHERE p.user_id = owner_user AND p.lead_sla_in_app = false
    ) IS NOT TRUE THEN
      INSERT INTO public.ss_notifications (user_id, kind, title, body, link)
      VALUES (
        owner_user, 'lead_sla',
        'Follow up with ' || l.full_name,
        'No inspection booked yet, this lead has been waiting since '
          || to_char(l.created_at, 'Mon FMDD') || '. Reminder #' || (l.reminder_count + 1) || '.',
        '/admin/crm/pipeline'
      );
    END IF;

    INSERT INTO public.ss_alerts (customer_id, tech_id, priority, title, body)
    VALUES (
      NULL, l.assigned_staff_id,
      CASE WHEN l.reminder_count >= 2 THEN 'high' ELSE 'normal' END,
      'Lead follow-up overdue, ' || l.full_name,
      COALESCE(l.city, '') || ' · no inspection scheduled · reminder #' || (l.reminder_count + 1)
    );

    -- ss_lead_events uses event_type + label (the old "event" column is gone).
    INSERT INTO public.ss_lead_events (lead_id, event_type, label, detail)
    VALUES (
      l.id,
      'sla_reminder',
      'Follow-up reminder #' || (l.reminder_count + 1),
      'Follow-up reminder #' || (l.reminder_count + 1) || ' sent, no inspection scheduled'
    );

    UPDATE public.ss_leads
       SET last_reminder_at = now(),
           reminder_count = l.reminder_count + 1,
           sla_status = 'overdue'
     WHERE id = l.id;

    sent := sent + 1;
  END LOOP;

  RETURN jsonb_build_object('reminders_sent', sent, 'leads_met', marked, 'ran_at', now());
END;
$function$
;
CREATE OR REPLACE FUNCTION public.ss_run_task_sla()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  global_cfg jsonb := public.ss_task_sla_config();
  cfg jsonb;
  warn_h numeric;
  esc_h numeric;
  reass_h numeric;
  fallback uuid;
  notify_office boolean;
  channels jsonb;
  t public.ss_internal_tasks%ROWTYPE;
  target_level int;
  vars jsonb;
  client_line text;
  assignee_name text;
  warned int := 0;
  escalated int := 0;
  reassigned int := 0;
  overridden int := 0;
  office_user uuid;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.ss_is_office() THEN
    RAISE EXCEPTION 'Only office staff can run task escalation';
  END IF;

  IF COALESCE((global_cfg->>'enabled')::boolean, true) IS NOT TRUE THEN
    RETURN jsonb_build_object('enabled', false, 'ran_at', now());
  END IF;

  FOR t IN
    SELECT * FROM public.ss_internal_tasks
    WHERE status = 'open' AND due_at IS NOT NULL AND due_at < now()
    ORDER BY due_at
    LIMIT 500
  LOOP
    cfg := public.ss_sla_effective_config(t.lead_id, t.customer_id);
    IF COALESCE((cfg->>'enabled')::boolean, true) IS NOT TRUE THEN
      CONTINUE;
    END IF;
    IF COALESCE((cfg->>'override')::boolean, false) THEN
      overridden := overridden + 1;
    END IF;

    warn_h := COALESCE((cfg->>'warn_hours')::numeric, 0);
    esc_h := COALESCE((cfg->>'escalate_hours')::numeric, 4);
    reass_h := COALESCE((cfg->>'reassign_hours')::numeric, 24);
    fallback := NULLIF(cfg->>'fallback_user_id', '')::uuid;
    notify_office := COALESCE((cfg->>'notify_office')::boolean, true);
    channels := COALESCE(cfg->'channels', '{"in_app": true, "email": false, "sms": false}'::jsonb);

    target_level := 0;
    IF now() >= t.due_at + make_interval(mins => (warn_h * 60)::int) THEN target_level := 1; END IF;
    IF now() >= t.due_at + make_interval(mins => (esc_h * 60)::int) THEN target_level := 2; END IF;
    IF fallback IS NOT NULL AND now() >= t.due_at + make_interval(mins => (reass_h * 60)::int) THEN
      target_level := 3;
    END IF;

    IF target_level <= t.escalation_level THEN
      CONTINUE;
    END IF;

    SELECT full_name INTO assignee_name FROM public.ss_staff WHERE user_id = t.assigned_to LIMIT 1;

    client_line := '';
    IF t.customer_id IS NOT NULL THEN
      SELECT 'Customer: ' || COALESCE(full_name, 'customer') || '.' INTO client_line
        FROM public.ss_customers WHERE id = t.customer_id;
    ELSIF t.lead_id IS NOT NULL THEN
      SELECT 'Lead: ' || COALESCE(full_name, 'lead') || '.' INTO client_line
        FROM public.ss_leads WHERE id = t.lead_id;
    END IF;

    vars := jsonb_build_object(
      'task', COALESCE(NULLIF(t.title, ''), 'Task'),
      'due', to_char(t.due_at, 'Mon FMDD HH12:MIam'),
      'assignee', COALESCE(assignee_name, 'team'),
      'client', COALESCE(client_line, ''),
      'priority', t.priority,
      'plan', COALESCE(cfg->>'override_label', 'Standard SLA')
    );

    IF target_level = 1 THEN
      PERFORM public.ss_sla_notify('warn', t.assigned_to, t.id, channels, vars);
      warned := warned + 1;

    ELSIF target_level = 2 THEN
      UPDATE public.ss_internal_tasks SET priority = 'high' WHERE id = t.id;
      PERFORM public.ss_sla_notify('escalate', t.assigned_to, t.id, channels, vars);
      IF notify_office THEN
        FOR office_user IN
          SELECT s.user_id FROM public.ss_staff s
          WHERE s.is_active AND s.user_id IS NOT NULL AND s.level IN ('owner','office_manager')
        LOOP
          PERFORM public.ss_sla_notify('office_escalate', office_user, t.id, channels, vars);
        END LOOP;
      END IF;
      escalated := escalated + 1;

    ELSE
      UPDATE public.ss_internal_tasks
         SET assigned_to = fallback,
             priority = 'high',
             escalated_from = COALESCE(t.escalated_from, t.assigned_to)
       WHERE id = t.id;
      PERFORM public.ss_sla_notify('reassign_new', fallback, t.id, channels, vars);
      IF t.assigned_to IS NOT NULL AND t.assigned_to <> fallback THEN
        PERFORM public.ss_sla_notify('reassign_prev', t.assigned_to, t.id, channels, vars);
      END IF;
      reassigned := reassigned + 1;
    END IF;

    UPDATE public.ss_internal_tasks
       SET escalation_level = target_level, last_escalated_at = now()
     WHERE id = t.id;
  END LOOP;

  RETURN jsonb_build_object('warned', warned, 'escalated', escalated,
                            'reassigned', reassigned, 'overrides_applied', overridden,
                            'ran_at', now());
END;
$function$
;