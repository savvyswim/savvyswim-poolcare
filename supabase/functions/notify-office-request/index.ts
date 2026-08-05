import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { z } from 'npm:zod@3.23.8'
import { sendTemplateEmail } from '../_shared/transactional-email-templates/send-email.ts'

const BodySchema = z.object({
  requestId: z.string().uuid().optional(),
  requestType: z.string().min(1).max(80).default('New booking request'),
  name: z.string().min(1).max(120),
  email: z.string().email().max(255),
  phone: z.string().max(40).optional(),
  address: z.string().max(300).optional(),
  service: z.string().min(1).max(200),
  preferredDate: z.string().max(60).optional(),
  preferredTime: z.string().max(60).optional(),
  notes: z.string().max(2000).optional(),
  sourceUrl: z.string().max(500).optional(),
})

const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false } },
)

const FALLBACK_RECIPIENT = 'marcus@santanariveragroup.com'

/** Office recipients: the configured setting, else active owners/office managers. */
async function officeRecipients(): Promise<string[]> {
  const emails: string[] = []

  const { data: setting } = await admin
    .from('ss_settings')
    .select('value')
    .eq('key', 'office_notification_emails')
    .maybeSingle()

  const raw = setting?.value as unknown
  if (Array.isArray(raw)) {
    for (const v of raw) if (typeof v === 'string') emails.push(v)
  } else if (typeof raw === 'string') {
    emails.push(...raw.split(/[,;\s]+/))
  }

  if (emails.length === 0) {
    const { data: staff } = await admin
      .from('ss_staff')
      .select('email, level, is_active')
      .eq('is_active', true)
      .in('level', ['owner', 'office_manager'])
    for (const s of staff ?? []) if (s.email) emails.push(s.email)
  }

  const clean = emails
    .map((e) => e.trim().toLowerCase())
    .filter((e) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e))

  const unique = [...new Set(clean)]
  return unique.length ? unique : [FALLBACK_RECIPIENT]
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const parsed = BodySchema.safeParse(await req.json())
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten().fieldErrors }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { requestId, ...data } = parsed.data
    const submittedAt = new Date().toLocaleString('en-US', {
      timeZone: 'America/Chicago',
      dateStyle: 'medium',
      timeStyle: 'short',
    }) + ' CT'

    const recipients = await officeRecipients()
    const results: Record<string, string> = {}

    for (const to of recipients) {
      try {
        const result = await sendTemplateEmail('office-new-request', to, {
          templateData: { ...data, submittedAt },
          replyTo: data.email,
          idempotencyKey: requestId ? `office-new-request:${requestId}:${to}` : undefined,
        })
        results[to] = result.sent ? 'sent' : result.reason
      } catch (err) {
        console.error(`office alert to ${to} failed:`, err)
        results[to] = 'failed'
      }
    }

    return new Response(JSON.stringify({ recipients: results }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('notify-office-request failed:', error)
    return new Response(JSON.stringify({ error: 'Failed to send office notification' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
