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
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

export interface ReceiptEmailProps {
  customerName: string
  invoiceNumber?: string
  amount: string
  paidOn: string
  method: string
  balance?: string
  note?: string
}

export const ReceiptEmail = ({
  customerName,
  invoiceNumber,
  amount,
  paidOn,
  method,
  balance,
  note,
}: ReceiptEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Payment received — {amount}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={eyebrow}>SAVVY SWIM · POOL CARE</Text>
        <Heading style={h1}>Payment received</Heading>
        <Text style={text}>
          Thanks {customerName} — we've recorded your payment. This is your
          receipt.
        </Text>

        <Section style={card}>
          <Text style={row}>
            <span style={amountStyle}>{amount}</span>
          </Text>
          <Text style={row}>
            <strong>Paid</strong> {paidOn}
            <br />
            <strong>Method</strong> {method}
            {invoiceNumber ? (
              <>
                <br />
                <strong>Invoice</strong> {invoiceNumber}
              </>
            ) : null}
            {balance ? (
              <>
                <br />
                <strong>Remaining balance</strong> {balance}
              </>
            ) : null}
          </Text>
          {note ? <Text style={row}>{note}</Text> : null}
        </Section>

        <Text style={text}>
          Questions? Call or text{' '}
          <Link href="tel:+14697440379" style={link}>
            (469) 744-0379
          </Link>
          .
        </Text>

        <Hr style={hr} />
        <Text style={footer}>
          Savvy Swim · Clear Water Guarantee — if your water isn't clear after a
          visit, we come back free, same day.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default ReceiptEmail

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
const amountStyle = { fontSize: '28px', fontWeight: 700 as const, color: '#8E1F2C' }
const link = { color: '#8E1F2C' }
const hr = { borderColor: '#E4DCCB', margin: '24px 0 16px' }
const footer = { fontSize: '12px', color: '#6C7278', lineHeight: '1.5', margin: 0 }

export const template: TemplateEntry = {
  component: ReceiptEmail,
  displayName: 'Payment receipt',
  subject: (data: Record<string, any>) =>
    `Receipt — payment of ${data.amount ?? ''} received`.trim(),
  previewData: {
    customerName: 'Marcus',
    invoiceNumber: 'SS-2026-004128',
    amount: '$189.00',
    paidOn: 'Aug 5, 2026',
    method: 'Card',
    balance: '$0.00',
  },
}
