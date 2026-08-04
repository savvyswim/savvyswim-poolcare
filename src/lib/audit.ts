import { supabase } from "@/integrations/supabase/client";

export type AuditArea = "auth" | "crm" | "store" | "team" | "general";

type AuditInput = {
  area: AuditArea;
  action: string;
  recordType?: string;
  recordId?: string | null;
  details?: Record<string, unknown>;
};

/**
 * Records an admin action in the audit log.
 * Fire-and-forget: never blocks or breaks the calling flow.
 */
export async function logAdminAction({ area, action, recordType, recordId, details }: AuditInput) {
  try {
    const { data } = await supabase.auth.getUser();
    const user = data.user;
    if (!user) return;
    await supabase.from("admin_audit_log").insert({
      user_id: user.id,
      user_email: user.email ?? null,
      area,
      action,
      record_type: recordType ?? null,
      record_id: recordId ? String(recordId) : null,
      details: (details ?? {}) as never,
    });
  } catch {
    /* logging must never surface errors to the user */
  }
}
