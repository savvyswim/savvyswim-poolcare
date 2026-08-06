import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

/**
 * Automated permission check for the service-photos bucket.
 *
 * Verifies the bucket stays private, that customer downloads are scoped to
 * their own <customer_id>/ folder, that uploads stay staff-only, and that no
 * anon/public policy targets the bucket. Runs on a schedule, after deploys
 * (Lovable-Context: cron / deploy), and on demand from /admin/security.
 */

const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false } },
)

const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const CHECK_KEY = 'service_photos_permissions'

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

/** Scheduled/deploy runs use the service key; humans must be an owner or admin. */
async function authorize(req: Request): Promise<'system' | 'admin' | null> {
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
  if (!token) return null
  if (token === SERVICE_ROLE_KEY) return 'system'

  const { data: userData } = await admin.auth.getUser(token)
  const user = userData?.user
  if (!user) return null

  const [{ data: staff }, { data: roles }] = await Promise.all([
    admin.from('ss_staff').select('level, is_active').eq('user_id', user.id).maybeSingle(),
    admin.from('user_roles').select('role').eq('user_id', user.id),
  ])
  const isOwner = !!staff?.is_active && staff.level === 'owner'
  const isAdmin = (roles ?? []).some((r) => r.role === 'admin')
  return isOwner || isAdmin ? 'admin' : null
}

type Rule = { rule: string; passed: boolean; detail: string }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const who = await authorize(req)
    if (!who) return json({ error: 'Unauthorized' }, 401)

    const context = req.headers.get('Lovable-Context') ?? ''
    const triggeredBy = who === 'system' ? (context === 'deploy' ? 'deploy' : 'schedule') : 'manual'

    const { data, error } = await admin.rpc('audit_service_photo_rules')
    if (error) throw error

    const result = data as { passed: boolean; rules: Rule[] }
    const rules = result.rules ?? []
    const failed = rules.filter((r) => !r.passed)

    const summary = failed.length
      ? `${failed.length} of ${rules.length} service-photo rules FAILED: ${failed.map((f) => f.rule).join(', ')}`
      : `All ${rules.length} service-photo permission rules pass`

    await admin.from('security_check_runs').insert({
      check_key: CHECK_KEY,
      passed: !failed.length,
      summary,
      details: { rules },
      triggered_by: triggeredBy,
    })

    // A failure is a live exposure — raise it for the office immediately.
    if (failed.length) {
      await admin.from('ss_alerts').insert({
        priority: 'high',
        title: 'Service photo permissions check FAILED',
        body: failed.map((f) => `${f.rule}: ${f.detail}`).join('\n'),
      })
    }

    return json({ passed: !failed.length, summary, rules, triggered_by: triggeredBy })
  } catch (e) {
    console.error('[security-audit] failed', e)
    return json({ error: e instanceof Error ? e.message : 'Unexpected error' }, 500)
  }
})
