import { createClient } from 'npm:@supabase/supabase-js@2'

type AuditEntry = {
  action: string
  actorKind?: 'user' | 'staff' | 'system' | 'webhook'
  actorUserId?: string | null
  actorStaffId?: string | null
  actorLabel?: string | null
  subjectTable?: string | null
  subjectId?: string | null
  success?: boolean
  outcome?: string | null
  details?: Record<string, unknown>
  request?: Request
}

/**
 * Append-only security audit trail. Never throws — auditing must not break
 * the operation it is recording.
 */
export async function recordAudit(entry: AuditEntry): Promise<void> {
  try {
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )
    const req = entry.request
    await admin.from('ss_security_audit').insert({
      action: entry.action,
      actor_kind: entry.actorKind ?? 'system',
      actor_user_id: entry.actorUserId ?? null,
      actor_staff_id: entry.actorStaffId ?? null,
      actor_label: entry.actorLabel ?? null,
      subject_table: entry.subjectTable ?? null,
      subject_id: entry.subjectId ? String(entry.subjectId).slice(0, 200) : null,
      success: entry.success ?? true,
      outcome: entry.outcome ? String(entry.outcome).slice(0, 500) : null,
      details: entry.details ?? {},
      ip_address:
        req?.headers.get('cf-connecting-ip') ??
        req?.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
        null,
      user_agent: req?.headers.get('user-agent')?.slice(0, 300) ?? null,
    })
  } catch (e) {
    console.error('recordAudit failed:', (e as Error).message)
  }
}
