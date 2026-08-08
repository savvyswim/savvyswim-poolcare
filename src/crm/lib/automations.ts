import { supabase } from "@/integrations/supabase/client";

/** Every point in the CRM that can kick off an automation. */
export const TRIGGERS = [
  { key: "visit_completed", label: "Visit completed" },
  { key: "job_completed", label: "Job marked complete" },
  { key: "job_created", label: "Job created" },
  { key: "quote_sent", label: "Quote sent" },
  { key: "quote_accepted", label: "Quote accepted" },
  { key: "invoice_paid", label: "Invoice paid" },
  { key: "ticket_opened", label: "Customer ticket opened" },
  { key: "chem_out_of_range", label: "Chemistry out of range" },
] as const;

export type TriggerKey = (typeof TRIGGERS)[number]["key"];

export const ACTIONS = [
  { key: "sms", label: "Text the customer" },
  { key: "feed_note", label: "Post to the customer feed" },
  { key: "create_job", label: "Create a job" },
  { key: "create_alert", label: "Raise an office alert" },
] as const;

export type ActionKey = (typeof ACTIONS)[number]["key"];

export const OPERATORS = [
  { key: "eq", label: "is" },
  { key: "neq", label: "is not" },
  { key: "gt", label: "is greater than" },
  { key: "lt", label: "is less than" },
  { key: "contains", label: "contains" },
] as const;

export type Condition = { field: string; op: (typeof OPERATORS)[number]["key"]; value: string };
export type Action = { type: ActionKey; text?: string; title?: string; price?: number; priority?: string };

export type Automation = {
  id: string;
  name: string;
  description: string | null;
  trigger_event: string;
  conditions: Condition[];
  actions: Action[];
  delay_minutes: number;
  active: boolean;
  run_count: number;
  last_run_at: string | null;
};

/** The payload each trigger hands to the rules — used for conditions + tokens. */
export type TriggerPayload = {
  customerId?: string | null;
  customerName?: string | null;
  phone?: string | null;
  amount?: number | null;
  city?: string | null;
  title?: string | null;
  plan?: string | null;
  [key: string]: unknown;
};

function matches(cond: Condition, payload: TriggerPayload) {
  const raw = payload[cond.field];
  const left = raw == null ? "" : String(raw);
  const right = cond.value ?? "";
  switch (cond.op) {
    case "eq":
      return left.toLowerCase() === right.toLowerCase();
    case "neq":
      return left.toLowerCase() !== right.toLowerCase();
    case "gt":
      return Number(left) > Number(right);
    case "lt":
      return Number(left) < Number(right);
    case "contains":
      return left.toLowerCase().includes(right.toLowerCase());
    default:
      return false;
  }
}

/** Replaces {customerName} style tokens in action copy. */
export function fillTokens(text: string, payload: TriggerPayload) {
  return text.replace(/\{(\w+)\}/g, (_m, key: string) => {
    const value = payload[key];
    return value == null ? "" : String(value);
  });
}

/**
 * Runs every active automation wired to `event`. Failures are logged as a run
 * row rather than thrown, so a broken rule never blocks the CRM action that
 * triggered it.
 */
export async function runAutomations(event: TriggerKey, payload: TriggerPayload) {
  const { data } = await supabase
    .from("ss_automations")
    .select("id,name,description,trigger_event,conditions,actions,delay_minutes,active,run_count,last_run_at")
    .eq("trigger_event", event)
    .eq("active", true);

  const rules = (data ?? []) as unknown as Automation[];
  let fired = 0;

  for (const rule of rules) {
    const conds = Array.isArray(rule.conditions) ? rule.conditions : [];
    if (conds.length && !conds.every((c) => matches(c, payload))) continue;

    const done: string[] = [];
    let failure: string | null = null;

    for (const action of Array.isArray(rule.actions) ? rule.actions : []) {
      try {
        await execute(action, payload);
        done.push(action.type);
      } catch (err) {
        failure = err instanceof Error ? err.message : "Action failed";
        break;
      }
    }

    await supabase.from("ss_automation_runs").insert({
      automation_id: rule.id,
      trigger_event: event,
      subject_label: payload.customerName ?? payload.title ?? null,
      status: failure ? "failed" : "ok",
      detail: failure ?? `Ran: ${done.join(", ") || "no actions"}`,
      payload: payload as never,
    });

    await supabase
      .from("ss_automations")
      .update({ run_count: (rule.run_count ?? 0) + 1, last_run_at: new Date().toISOString() })
      .eq("id", rule.id);

    fired += 1;
  }

  return fired;
}

async function execute(action: Action, payload: TriggerPayload) {
  switch (action.type) {
    case "sms": {
      if (!payload.phone) throw new Error("No mobile number on file");
      const { startThread, sendThreadSms } = await import("@/lib/sms.functions");
      const thread = await startThread({
        data: {
          phone: payload.phone,
          ...(payload.customerId ? { customerId: payload.customerId } : {}),
          ...(payload.customerName ? { displayName: payload.customerName } : {}),
        },
      });
      await sendThreadSms({
        data: { threadId: thread.id, body: fillTokens(action.text ?? "", payload).slice(0, 1200) },
      });
      return;
    }
    case "feed_note": {
      if (!payload.customerId) throw new Error("No customer on this trigger");
      const { error } = await supabase.from("ss_feed").insert({
        customer_id: payload.customerId,
        kind: "automation",
        title: action.title ?? "Update from Savvy Swim",
        body: fillTokens(action.text ?? "", payload),
      });
      if (error) throw new Error(error.message);
      return;
    }
    case "create_job": {
      if (!payload.customerId) throw new Error("No customer on this trigger");
      const { error } = await supabase.from("ss_jobs").insert({
        customer_id: payload.customerId,
        title: fillTokens(action.title ?? "Follow-up", payload),
        details: fillTokens(action.text ?? "", payload) || null,
        price: Number(action.price ?? 0),
        status: "open",
        auto_flag_source: "automation",
      });
      if (error) throw new Error(error.message);
      return;
    }
    case "create_alert": {
      const { error } = await supabase.from("ss_alerts").insert({
        customer_id: payload.customerId ?? null,
        title: fillTokens(action.title ?? "Automation alert", payload),
        body: fillTokens(action.text ?? "", payload) || null,
        priority: action.priority ?? "normal",
      });
      if (error) throw new Error(error.message);
      return;
    }
    default:
      throw new Error("Unknown action");
  }
}
