import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { z } from 'npm:zod@3.23.8'
import { sendTemplateEmail } from '../_shared/transactional-email-templates/send-email.ts'

// The booking row is the only source of truth: callers may reference a booking,
// never dictate the recipient or the contents of the email.
const BodySchema = z.object({
  bookingId: z.string().uuid(),
})

const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false } },
)

function prettyDate(iso: string | null): string {
  if (!iso) return 'To be confirmed'
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return iso
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const parsed = BodySchema.safeParse(await req.json())
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: parsed.error.flatten().fieldErrors }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { bookingId } = parsed.data

    // Only send for a booking that actually exists, and only to its own email.
    const { data: booking } = await admin
      .from('bookings')
      .select('id, name, email, service, address, notes, preferred_date, preferred_time, created_at')
      .eq('id', bookingId)
      .maybeSingle()

    if (!booking) {
      return new Response(JSON.stringify({ error: 'Booking not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const result = await sendTemplateEmail('booking-confirmation', booking.email, {
      templateData: {
        name: booking.name,
        service: booking.service,
        preferredDate: prettyDate(booking.preferred_date),
        preferredTime: booking.preferred_time ?? 'Anytime',
        address: booking.address ?? undefined,
        notes: booking.notes ?? undefined,
      },
      idempotencyKey: `booking-confirmation:${booking.id}`,
    })

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('send-booking-confirmation failed:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to send confirmation email' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
