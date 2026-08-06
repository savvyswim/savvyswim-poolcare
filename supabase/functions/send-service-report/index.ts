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

    let allowed = token === SERVICE_ROLE_KEY
    if (!allowed && token) {
      const { data: userData } = await admin.auth.getUser(token)
      if (userData?.user) {
        const { data: staff } = await admin
          .from('ss_staff')
          .select('is_active')
          .eq('user_id', userData.user.id)
          .maybeSingle()
        allowed = !!staff?.is_active
      }
    }
    if (!allowed) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body = await req.json()
    const {
      visitId,
      email,
      name,
      visitDate,
      address,
      techName,
      minutes,
      summary,
      allGood,
      metrics,
      treatments,
      tasksCompleted,
      photos,
      notes,
    } = body ?? {}

    if (!email || !Array.isArray(metrics)) {
      return new Response(JSON.stringify({ error: 'email and metrics are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
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
