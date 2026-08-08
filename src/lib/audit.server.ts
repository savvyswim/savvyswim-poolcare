export type AuditEntry = {
  action: string;
  actorKind?: "user" | "staff" | "system" | "webhook";
  actorUserId?: string | null;
  actorStaffId?: string | null;
  actorLabel?: string | null;
  subjectTable?: string | null;
  subjectId?: string | null;
  success?: boolean;
  outcome?: string | null;
  details?: Record<string, unknown>;
  request?: Request;
};

/**
 * Append-only security audit trail for server routes (webhooks, public APIs).
 * Never throws — auditing must not break the operation it records.
 */
export async function recordAudit(entry: AuditEntry): Promise<void> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const req = entry.request;
    await supabaseAdmin.from("ss_security_audit").insert({
      action: entry.action,
      actor_kind: entry.actorKind ?? "webhook",
      actor_user_id: entry.actorUserId ?? null,
      actor_staff_id: entry.actorStaffId ?? null,
      actor_label: entry.actorLabel ?? null,
      subject_table: entry.subjectTable ?? null,
      subject_id: entry.subjectId ? String(entry.subjectId).slice(0, 200) : null,
      success: entry.success ?? true,
      outcome: entry.outcome ? String(entry.outcome).slice(0, 500) : null,
      details: (entry.details ?? {}) as never,
      ip_address:
        req?.headers.get("cf-connecting-ip") ??
        req?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        null,
      user_agent: req?.headers.get("user-agent")?.slice(0, 300) ?? null,
    });
  } catch (e) {
    console.error("recordAudit failed", e);
  }
}
