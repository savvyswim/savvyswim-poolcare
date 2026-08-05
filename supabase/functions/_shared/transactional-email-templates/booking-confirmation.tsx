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

export interface BookingConfirmationProps {
  name: string
  service: string
  preferredDate: string
  preferredTime: string
  address?: string
  notes?: string
}

export const BookingConfirmationEmail = ({
  name,
  service,
  preferredDate,
  preferredTime,
  address,
  notes,
}: BookingConfirmationProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>
      We got your request — {service} on {preferredDate}
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={eyebrow}>SAVVY SWIM · POOL CARE</Text>
        <Heading style={h1}>On duty, so you don't have to be.</Heading>
        <Text style={text}>
          Thanks {name} — we received your booking request. A Savvy Swim
          dispatcher will confirm your window shortly.
        </Text>

        <Section style={card}>
          <Text style={row}>
            <strong>Service</strong>
            <br />
            {service}
          </Text>
          <Text style={row}>
            <strong>Requested time</strong>
            <br />
            {preferredDate} · {preferredTime}
          </Text>
          {address ? (
            <Text style={row}>
              <strong>Address</strong>
              <br />
              {address}
            </Text>
          ) : null}
          {notes ? (
            <Text style={row}>
              <strong>Notes</strong>
              <br />
              {notes}
            </Text>
          ) : null}
        </Section>

        <Text style={text}>
          Need to change something? Call or text us at{' '}
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

export default BookingConfirmationEmail

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
const eyebrow = {
  fontSize: '11px',
  letterSpacing: '0.18em',
  color: '#8E1F2C',
  margin: '0 0 12px',
}
const h1 = {
  fontSize: '26px',
  lineHeight: '1.15',
  fontWeight: 700 as const,
  color: '#12232E',
  margin: '0 0 18px',
}
const text = {
  fontSize: '14px',
  color: '#41474D',
  lineHeight: '1.6',
  margin: '0 0 18px',
}
const card = {
  backgroundColor: '#F4EFE3',
  padding: '18px 20px',
  margin: '0 0 22px',
  borderLeft: '3px solid #1FA9BE',
}
const row = {
  fontSize: '14px',
  color: '#12232E',
  lineHeight: '1.5',
  margin: '0 0 12px',
}
const link = { color: '#8E1F2C' }
const hr = { borderColor: '#E4DCCB', margin: '24px 0 16px' }
const footer = { fontSize: '12px', color: '#6C7278', lineHeight: '1.5', margin: 0 }

export const template: TemplateEntry = {
  component: BookingConfirmationEmail,
  displayName: 'Booking confirmation',
  subject: (data: Record<string, any>) =>
    `We got your request — ${data.service ?? 'pool service'}`,
  previewData: {
    name: 'Marcus',
    service: 'Weekly pool cleaning',
    preferredDate: 'Fri, Aug 14',
    preferredTime: 'Morning (8am – 12pm)',
    address: '1201 Legacy Dr, Frisco, TX',
    notes: 'Gate code 4412 — dog in the yard.',
  },
}
