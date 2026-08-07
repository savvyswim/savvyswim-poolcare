import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { sendTemplateEmail } from '../_shared/transactional-email-templates/send-email.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const auth = req.headers.get('Authorization') ?? ''
    const token = auth.replace(/^Bearer\s+/i, '')
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

    const isSystem = token === SERVICE_ROLE_KEY
    let staffId: string | null = null
    let isOffice = false

    if (!isSystem) {
      if (!token) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      const { data: userData } = await admin.auth.getUser(token)
      if (!userData?.user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      const { data: staff } = await admin
        .from('ss_staff')
        .select('id, level, is_active')
        .eq('user_id', userData.user.id)
        .maybeSingle()
      if (!staff?.is_active) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      staffId = staff.id
      isOffice = staff.level === 'owner' || staff.level === 'office_manager'
    }

    const body = await req.json()
    const {
      visitId,
      minutes,
      summary,
      allGood,
      metrics,
      treatments,
      tasksCompleted,
      photos,
      notes,
    } = body ?? {}

    if (!visitId || !Array.isArray(metrics)) {
      return new Response(JSON.stringify({ error: 'visitId and metrics are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Recipient and visit facts come from the database — never from the caller.
    const { data: visit } = await admin
      .from('ss_visits')
      .select('id, tech_id, customer_id, scheduled_date')
      .eq('id', visitId)
      .maybeSingle()
    if (!visit) {
      return new Response(JSON.stringify({ error: 'Visit not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!isSystem && !isOffice && visit.tech_id !== staffId) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: customer } = await admin
      .from('ss_customers')
      .select('full_name, email, address, city')
      .eq('id', visit.customer_id)
      .maybeSingle()

    const email = customer?.email
    if (!email) {
      return new Response(JSON.stringify({ error: 'Customer has no email on file' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const name = (customer?.full_name ?? 'there').split(' ')[0]
    const address = [customer?.address, customer?.city].filter(Boolean).join(', ') || undefined
    const visitDate = new Date(visit.scheduled_date ?? Date.now()).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })

    let techName: string | undefined
    if (visit.tech_id) {
      const { data: tech } = await admin
        .from('ss_staff')
        .select('full_name')
        .eq('id', visit.tech_id)
        .maybeSingle()
      techName = (tech as { full_name?: string } | null)?.full_name ?? undefined
    }


    const result = await sendTemplateEmail('service-report', email, {
      idempotencyKey: visitId ? `service-report:${visitId}` : undefined,
      templateData: {
        name: name || 'there',
        visitDate: visitDate || new Date().toLocaleDateString('en-US'),
        address,
        techName,
        minutes,
        summary: summary || 'Service complete.',
        allGood: !!allGood,
        metrics,
        treatments: treatments ?? [],
        tasksCompleted,
        photos: Array.isArray(photos)
          ? photos
              .filter((p: { url?: string }) => typeof p?.url === 'string' && p.url.length > 0)
              .slice(0, 6)
              .map((p: { label?: string; url: string }) => ({ label: p.label ?? 'Visit photo', url: p.url }))
          : [],
        notes,
      },
    })

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('send-service-report failed:', error)
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
