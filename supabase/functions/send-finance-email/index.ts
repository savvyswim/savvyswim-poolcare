import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { z } from 'npm:zod@3.23.8'
import { sendTemplateEmail } from '../_shared/transactional-email-templates/send-email.ts'

const BodySchema = z.object({
  type: z.enum(['invoice', 'receipt']),
  invoiceId: z.string().uuid(),
  paymentAmount: z.number().positive().max(1_000_000).optional(),
  method: z.string().max(60).optional(),
  note: z.string().max(500).optional(),
})

const money = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

const day = (iso: string | null | undefined) =>
  iso
    ? new Date(iso.length <= 10 ? `${iso}T12:00:00Z` : iso).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'America/Chicago',
      })
    : undefined

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    )
    const token = authHeader.replace('Bearer ', '')
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token)
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Only office/owner staff may email customers billing documents.
    const { data: isOffice } = await userClient.rpc('ss_is_office')
    if (!isOffice) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const parsed = BodySchema.safeParse(await req.json())
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten().fieldErrors }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const { type, invoiceId, paymentAmount, method, note } = parsed.data

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data: invoice, error: invErr } = await admin
      .from('ss_invoices')
      .select('id, invoice_number, amount, issued_on, due_date, status, customer_id')
      .eq('id', invoiceId)
      .maybeSingle()
    if (invErr) throw invErr
    if (!invoice) {
      return new Response(JSON.stringify({ error: 'Invoice not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: customer } = await admin
      .from('ss_customers')
      .select('full_name, email')
      .eq('id', invoice.customer_id)
      .maybeSingle()

    if (!customer?.email) {
      return new Response(
        JSON.stringify({ sent: false, reason: 'customer_has_no_email' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const { data: payments } = await admin
      .from('ss_payments')
      .select('amount')
      .eq('invoice_id', invoice.id)
    const paidTotal = (payments ?? []).reduce((s, p) => s + Number(p.amount), 0)
    const balance = Math.max(Number(invoice.amount) - paidTotal, 0)

    let result
    if (type === 'invoice') {
      const { data: items } = await admin
        .from('ss_invoice_items')
        .select('description, quantity, line_total')
        .eq('invoice_id', invoice.id)

      result = await sendTemplateEmail('invoice', customer.email, {
        idempotencyKey: `invoice:${invoice.id}`,
        templateData: {
          customerName: customer.full_name,
          invoiceNumber: invoice.invoice_number,
          issuedOn: day(invoice.issued_on),
          dueDate: day(invoice.due_date),
          amount: money(Number(invoice.amount)),
          balance: money(balance),
          lines: (items ?? []).map((i) => ({
            description: i.description,
            quantity: Number(i.quantity),
            lineTotal: money(Number(i.line_total)),
          })),
        },
      })
    } else {
      const amount = paymentAmount ?? paidTotal
      result = await sendTemplateEmail('receipt', customer.email, {
        idempotencyKey: `receipt:${invoice.id}:${amount}:${paidTotal}`,
        templateData: {
          customerName: customer.full_name,
          invoiceNumber: invoice.invoice_number,
          amount: money(amount),
          paidOn: day(new Date().toISOString()),
          method: method ?? 'Manual',
          balance: money(balance),
          note,
        },
      })
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('send-finance-email failed:', error)
    return new Response(JSON.stringify({ error: 'Failed to send email' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
