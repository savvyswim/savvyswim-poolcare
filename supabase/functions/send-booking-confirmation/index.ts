import * as React from 'npm:react@18.3.1'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { z } from 'npm:zod@3.23.8'
import { sendTemplateEmail } from '../_shared/transactional-email-templates/send-email.ts'

const BodySchema = z.object({
  bookingId: z.string().uuid().optional(),
  name: z.string().min(1).max(120),
  email: z.string().email().max(255),
  service: z.string().min(1).max(160),
  preferredDate: z.string().min(1).max(60),
  preferredTime: z.string().min(1).max(60),
  address: z.string().max(300).optional(),
  notes: z.string().max(1000).optional(),
})

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

    const { bookingId, email, ...data } = parsed.data

    const result = await sendTemplateEmail('booking-confirmation', email, {
      templateData: data,
      idempotencyKey: bookingId ? `booking-confirmation:${bookingId}` : undefined,
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
