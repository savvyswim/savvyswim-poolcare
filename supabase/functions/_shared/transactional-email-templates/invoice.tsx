/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Row,
  Column,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

export interface InvoiceLine {
  description: string
  quantity: number
  lineTotal: string
}

export interface InvoiceEmailProps {
  customerName: string
  invoiceNumber: string
  issuedOn: string
  dueDate?: string
  amount: string
  balance?: string
  lines?: InvoiceLine[]
  payUrl?: string
}

export const InvoiceEmail = ({
  customerName,
  invoiceNumber,
  issuedOn,
  dueDate,
  amount,
  balance,
  lines = [],
  payUrl,
}: InvoiceEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>
      Invoice {invoiceNumber} — {amount}
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={eyebrow}>SAVVY SWIM · POOL CARE</Text>
        <Heading style={h1}>Invoice {invoiceNumber}</Heading>
        <Text style={text}>
          Hi {customerName}, here's your latest invoice for pool service.
        </Text>

        <Section style={card}>
          <Text style={row}>
            <strong>Amount due</strong>
            <br />
            <span style={amountStyle}>{balance || amount}</span>
          </Text>
          <Text style={row}>
            <strong>Issued</strong> {issuedOn}
            {dueDate ? (
              <>
                <br />
                <strong>Due</strong> {dueDate}
              </>
            ) : null}
          </Text>
        </Section>

        {lines.length ? (
          <Section>
            {lines.map((l, i) => (
              <Row key={i} style={lineRow}>
                <Column>
                  <Text style={lineText}>
                    {l.description}
                    {l.quantity > 1 ? ` × ${l.quantity}` : ''}
                  </Text>
                </Column>
                <Column align="right">
                  <Text style={lineText}>{l.lineTotal}</Text>
                </Column>
              </Row>
            ))}
            <Hr style={hr} />
            <Row>
              <Column>
                <Text style={totalText}>Total</Text>
              </Column>
              <Column align="right">
                <Text style={totalText}>{amount}</Text>
              </Column>
            </Row>
          </Section>
        ) : null}

        {payUrl ? (
          <Text style={text}>
            <Link href={payUrl} style={link}>
              Pay this invoice online →
            </Link>
          </Text>
        ) : null}

        <Text style={text}>
          Questions about this invoice? Call or text{' '}
          <Link href="tel:+14692138087" style={link}>
            (469) 213-8087
          </Link>
          .
        </Text>

        <Hr style={hr} />
        <Text style={footer}>Savvy Swim · On duty, so you don't have to be.</Text>
      </Container>
    </Body>
  </Html>
)

export default InvoiceEmail

const main = {
  backgroundColor: '#F4EFE3',
  fontFamily: "'Helvetica Neue', Arial, sans-serif",
  padding: '24px 0',
}
const container = {
  backgroundColor: '#FFFFFF',
  padding: '32px 28px',
  maxWidth: '560px',
  border: '1px solid #E4DCCB',
}
const eyebrow = { fontSize: '11px', letterSpacing: '0.18em', color: '#8E1F2C', margin: '0 0 12px' }
const h1 = {
  fontSize: '26px',
  lineHeight: '1.15',
  fontWeight: 700 as const,
  color: '#12232E',
  margin: '0 0 18px',
}
const text = { fontSize: '14px', color: '#41474D', lineHeight: '1.6', margin: '0 0 18px' }
const card = {
  backgroundColor: '#F4EFE3',
  padding: '18px 20px',
  margin: '0 0 22px',
  borderLeft: '3px solid #1FA9BE',
}
const row = { fontSize: '14px', color: '#12232E', lineHeight: '1.6', margin: '0 0 12px' }
const amountStyle = { fontSize: '24px', fontWeight: 700 as const, color: '#8E1F2C' }
const lineRow = { borderBottom: '1px solid #F0EADC' }
const lineText = { fontSize: '13px', color: '#41474D', margin: '8px 0' }
const totalText = { fontSize: '14px', fontWeight: 700 as const, color: '#12232E', margin: '8px 0' }
const link = { color: '#8E1F2C' }
const hr = { borderColor: '#E4DCCB', margin: '18px 0 16px' }
const footer = { fontSize: '12px', color: '#6C7278', lineHeight: '1.5', margin: 0 }

export const template: TemplateEntry = {
  component: InvoiceEmail,
  displayName: 'Invoice',
  subject: (data: Record<string, any>) =>
    `Invoice ${data.invoiceNumber ?? ''} from Savvy Swim`.trim(),
  previewData: {
    customerName: 'Marcus',
    invoiceNumber: 'SS-2026-004128',
    issuedOn: 'Aug 5, 2026',
    dueDate: 'Aug 19, 2026',
    amount: '$189.00',
    balance: '$189.00',
    lines: [
      { description: 'Weekly pool cleaning — August', quantity: 4, lineTotal: '$139.00' },
      { description: 'Filter clean', quantity: 1, lineTotal: '$50.00' },
    ],
  },
}
