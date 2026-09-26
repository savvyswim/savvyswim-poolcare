SET check_function_bodies = off;
CREATE OR REPLACE FUNCTION public.ss_tg_booking_to_lead()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_city text;
BEGIN
  SELECT c.city INTO v_city
    FROM public.ss_city_rates c
   WHERE c.is_active AND NEW.address ILIKE '%' || c.city || '%'
   ORDER BY length(c.city) DESC
   LIMIT 1;

  INSERT INTO public.ss_leads (full_name, email, phone, address, city, message, source, intake_channel, intake_ref)
  VALUES (NEW.name, NEW.email, NEW.phone, nullif(NEW.address,'Not provided'), v_city,
          coalesce(NEW.service,'') || coalesce(', ' || NEW.notes, ''),
          'website', 'booking_form', NEW.id)
  ON CONFLICT (intake_channel, intake_ref) DO NOTHING;

  RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.ss_tg_chat_touch()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.ss_chat_channels
     SET last_message_at = NEW.created_at,
         last_preview = left(NEW.body, 140)
   WHERE id = NEW.channel_id;
  RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.ss_tg_contract_first_payment_amount()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v numeric;
BEGIN
  IF NEW.first_payment_amount IS NOT NULL AND NEW.first_payment_amount > 0 THEN
    RETURN NEW;
  END IF;

  v := NULLIF(regexp_replace(COALESCE(NEW.merge_data->>'total',''), '[^0-9.]', '', 'g'), '')::numeric;
  IF v IS NULL OR v <= 0 THEN
    v := NULLIF(regexp_replace(COALESCE(NEW.merge_data->>'monthly_price',''), '[^0-9.]', '', 'g'), '')::numeric;
  END IF;
  IF v IS NULL OR v <= 0 THEN
    v := NULLIF(regexp_replace(COALESCE(NEW.merge_data->'summary'->>'monthly_price',''), '[^0-9.]', '', 'g'), '')::numeric;
  END IF;

  IF v IS NOT NULL AND v > 0 THEN
    NEW.first_payment_amount := v;
  END IF;
  RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.ss_tg_contract_signed_invite()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_code text;
  v_cust public.ss_customers;
BEGIN
  IF NEW.status <> 'signed' OR COALESCE(OLD.status, '') = 'signed' THEN
    RETURN NEW;
  END IF;

  -- Already has a live invite, or the signer already has a portal login: nothing to do.
  IF EXISTS (SELECT 1 FROM public.ss_access_codes WHERE contract_id = NEW.id AND status = 'active') THEN
    RETURN NEW;
  END IF;
  IF NEW.customer_id IS NOT NULL THEN
    SELECT * INTO v_cust FROM public.ss_customers WHERE id = NEW.customer_id;
    IF v_cust.user_id IS NOT NULL THEN
      RETURN NEW;
    END IF;
  END IF;

  v_code := 'SAVVY-' || upper(substr(md5(gen_random_uuid()::text), 1, 4)) || '-' || upper(substr(md5(gen_random_uuid()::text), 5, 4));

  INSERT INTO public.ss_access_codes
    (code, customer_id, contract_id, source, full_name, email, phone, address, city, state, postal_code, note, status, expires_at)
  VALUES (
    v_code,
    NEW.customer_id,
    NEW.id,
    'contract_signed',
    COALESCE(NEW.signer_name, NEW.recipient_name, v_cust.full_name),
    COALESCE(NEW.recipient_email, v_cust.email),
    COALESCE(NEW.recipient_phone, v_cust.phone),
    v_cust.address, v_cust.city, v_cust.state, v_cust.postal_code,
    'Auto-issued when "' || NEW.title || '" was signed',
    'active',
    now() + interval '14 days'
  );

  RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.ss_tg_contract_signed_promote()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.signed_at IS NOT NULL AND (OLD.signed_at IS NULL) THEN
    PERFORM public.ss_promote_prospect(NEW.customer_id);
  END IF;
  RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.ss_tg_disable_tag_on_archive()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = 'inactive' AND COALESCE(OLD.status::text, '') <> 'inactive' THEN
    UPDATE public.ss_qr_tags
       SET status = 'disabled',
           disabled_at = now(),
           disabled_reason = COALESCE(disabled_reason, 'customer_archived')
     WHERE customer_id = NEW.id
       AND status <> 'disabled';
  END IF;
  RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.ss_tg_inspection_to_lead()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_city text;
BEGIN
  SELECT c.city INTO v_city
    FROM public.ss_city_rates c
   WHERE c.is_active AND NEW.address ILIKE '%' || c.city || '%'
   ORDER BY length(c.city) DESC
   LIMIT 1;

  INSERT INTO public.ss_leads (full_name, email, phone, address, city, message, source, intake_channel, intake_ref)
  VALUES (NEW.full_name, NEW.email, NEW.phone, NEW.address, v_city,
          'Free inspection ' || NEW.reference_number ||
            coalesce(', ' || NEW.pool_details, '') || coalesce(', ' || NEW.notes, ''),
          coalesce(nullif(NEW.utm_source,''), 'website'), 'inspection_request', NEW.id)
  ON CONFLICT (intake_channel, intake_ref) DO NOTHING;

  RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.ss_tg_lead_alert()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM net.http_post(
    url := 'https://savvyswim.app/api/public/hooks/lead-alert',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := jsonb_build_object('lead_id', NEW.id)
  );
  RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.ss_tg_lead_intake()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.stage IS NULL THEN
    NEW.stage := 'new_lead';
  END IF;
  IF NEW.assigned_staff_id IS NULL THEN
    NEW.assigned_staff_id := public.ss_pick_lead_owner(NEW.city);
  END IF;
  IF NEW.assigned_staff_id IS NOT NULL AND NEW.assigned_at IS NULL THEN
    NEW.assigned_at := now();
  END IF;
  RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.ss_tg_lead_sla_due()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  cfg jsonb := public.ss_lead_sla_config();
BEGIN
  IF NEW.sla_due_at IS NULL THEN
    NEW.sla_due_at := COALESCE(NEW.created_at, now())
      + make_interval(hours => COALESCE((cfg->>'first_response_hours')::int, 2));
  END IF;
  RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.ss_tg_payment_recalc_invoice()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP <> 'INSERT' AND OLD.invoice_id IS NOT NULL THEN
    PERFORM public.ss_recalc_invoice_paid(OLD.invoice_id);
  END IF;
  IF TG_OP <> 'DELETE' AND NEW.invoice_id IS NOT NULL THEN
    PERFORM public.ss_recalc_invoice_paid(NEW.invoice_id);
  END IF;
  RETURN NULL;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.ss_tg_quote_accepted_promote()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.accepted_at IS NOT NULL AND (OLD.accepted_at IS NULL) THEN
    PERFORM public.ss_promote_prospect(NEW.customer_id);
  END IF;
  RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.ss_tg_set_billing_anchor()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.customer_id IS NOT NULL AND NEW.scheduled_date IS NOT NULL THEN
    UPDATE public.ss_customers
       SET billing_anchor_date = NEW.scheduled_date
     WHERE id = NEW.customer_id
       AND (billing_anchor_date IS NULL OR NEW.scheduled_date < billing_anchor_date);
  END IF;
  RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.ss_tg_visit_care_cycle()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  did_filter boolean := false;
  did_salt boolean := false;
  done_on date := coalesce(new.completed_at::date, new.scheduled_date, current_date);
begin
  if new.status is distinct from 'completed' then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.status = 'completed' then
    return new;
  end if;

  did_filter := coalesce((new.checklist->>'filter_clean')::boolean, (new.checklist->>'filter_cleaning')::boolean, false)
                or coalesce(new.cartridge_cleaned, false);
  did_salt := coalesce((new.checklist->>'salt_cell_clean')::boolean, (new.checklist->>'salt_cell_cleaning')::boolean, false);

  if did_filter then
    update public.ss_customers
       set last_filter_clean_at = done_on,
           filter_interval_days = coalesce(nullif(filter_interval_days, 0), 120)
     where id = new.customer_id;
  end if;

  if did_salt then
    update public.ss_customers
       set last_salt_cell_clean_at = done_on,
           salt_cell_interval_days = coalesce(nullif(salt_cell_interval_days, 0), 120)
     where id = new.customer_id;
  end if;

  if coalesce(new.cartridge_cleaned, false) then
    update public.ss_customers set last_cartridge_clean_at = done_on where id = new.customer_id;
  end if;

  if coalesce(new.backwash_done, false) then
    update public.ss_customers set last_backwash_at = done_on where id = new.customer_id;
  end if;

  if new.filter_type is not null and new.filter_type <> '' then
    update public.ss_customers
       set filter_type = new.filter_type,
           filter_identified_at = coalesce(filter_identified_at, now()),
           filter_label_photo_url = coalesce(new.filter_label_photo_url, filter_label_photo_url)
     where id = new.customer_id
       and (filter_type is null or filter_type = '' or filter_type = 'unknown' or new.filter_label_photo_url is not null);
  end if;

  if new.filter_psi_after is not null then
    update public.ss_customers
       set filter_baseline_psi = new.filter_psi_after
     where id = new.customer_id
       and (filter_baseline_psi is null or new.filter_psi_after < filter_baseline_psi);
  end if;

  return new;
end;
$function$
;