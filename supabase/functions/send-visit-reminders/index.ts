import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { sendTemplateEmail } from '../_shared/transactional-email-templates/send-email.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

/** YYYY-MM-DD for "tomorrow" in America/Chicago. */
function tomorrowInCT(): string {
  const now = new Date()
  const ct = new Date(now.toLocaleString('en-US', { timeZone: 'America/Chicago' }))
  ct.setDate(ct.getDate() + 1)
  const m = String(ct.getMonth() + 1).padStart(2, '0')
  const d = String(ct.getDate()).padStart(2, '0')
  return `${ct.getFullYear()}-${m}-${d}`
}

function prettyDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

async function isAuthorized(req: Request): Promise<boolean> {
  const auth = req.headers.get('Authorization') ?? ''
  const token = auth.replace(/^Bearer\s+/i, '')
  if (!token) return false
  if (token === SERVICE_ROLE_KEY) return true

  // Allow an authenticated owner / office manager to trigger a manual run.
  const client = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
  const { data: userData } = await client.auth.getUser(token)
  if (!userData?.user) return false
  const { data: staff } = await client
    .from('ss_staff')
    .select('level, is_active')
    .eq('user_id', userData.user.id)
    .maybeSingle()
  return !!staff?.is_active && ['owner', 'office_manager'].includes(staff.level)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (!(await isAuthorized(req))) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
    const target = tomorrowInCT()
    const when = prettyDate(target)

    let sent = 0
    let skipped = 0
    const errors: string[] = []

    // 1 — Routed service visits scheduled for tomorrow
    const { data: visits, error: visitsError } = await supabase
      .from('ss_visits')
      .select(
        'id, status, scheduled_date, notes, customer:ss_customers(full_name, email, address, city, service_level, gate_code), tech:ss_staff(full_name)'
      )
      .eq('scheduled_date', target)
      .in('status', ['scheduled', 'pending', 'en_route'])

    if (visitsError) throw visitsError

    for (const v of visits ?? []) {
      const customer: any = v.customer
      if (!customer?.email) {
        skipped++
        continue
      }
      try {
        const result = await sendTemplateEmail('visit-reminder', customer.email, {
          idempotencyKey: `visit-reminder:${v.id}`,
          templateData: {
            name: customer.full_name?.split(' ')[0] ?? 'there',
            service: customer.service_level
              ? `${customer.service_level} pool service`
              : 'Pool service',
            visitDate: when,
            visitWindow: 'Between 8am and 5pm',
            address: [customer.address, customer.city].filter(Boolean).join(', ') || undefined,
            techName: (v.tech as any)?.full_name ?? undefined,
            notes: v.notes ?? undefined,
          },
        })
        result.sent ? sent++ : skipped++
      } catch (e) {
        errors.push(`visit ${v.id}: ${(e as Error).message}`)
      }
    }

    // 2 — Website bookings confirmed for tomorrow
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('id, name, email, address, service, preferred_date, preferred_time, notes, status')
      .eq('preferred_date', target)
      .in('status', ['new', 'confirmed', 'scheduled'])

    if (bookingsError) throw bookingsError

    for (const b of bookings ?? []) {
      if (!b.email) {
        skipped++
        continue
      }
      try {
        const result = await sendTemplateEmail('visit-reminder', b.email, {
          idempotencyKey: `visit-reminder:booking:${b.id}`,
          templateData: {
            name: b.name?.split(' ')[0] ?? 'there',
            service: b.service ?? 'Pool service',
            visitDate: when,
            visitWindow: b.preferred_time ?? undefined,
            address: b.address ?? undefined,
            notes: b.notes ?? undefined,
          },
        })
        result.sent ? sent++ : skipped++
      } catch (e) {
        errors.push(`booking ${b.id}: ${(e as Error).message}`)
      }
    }

    console.log(`send-visit-reminders ${target}: sent=${sent} skipped=${skipped} errors=${errors.length}`)

    return new Response(
      JSON.stringify({ date: target, sent, skipped, errors }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('send-visit-reminders failed:', error)
    return new Response(JSON.stringify({ error: 'Failed to send reminders' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
