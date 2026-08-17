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

export interface VisitReminderProps {
  name: string
  service: string
  visitDate: string
  visitWindow?: string
  address?: string
  techName?: string
  notes?: string
}

export const VisitReminderEmail = ({
  name,
  service,
  visitDate,
  visitWindow,
  address,
  techName,
  notes,
}: VisitReminderProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>
      Reminder — {service} tomorrow, {visitDate}
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={eyebrow}>SAVVY SWIM · SERVICE REMINDER</Text>
        <Heading style={h1}>We're on the route tomorrow.</Heading>
        <Text style={text}>
          Hi {name} — this is a heads-up that your Savvy Swim service is
          scheduled for tomorrow. Please unlock the gate and keep pets inside so
          our tech can get straight to work.
        </Text>

        <Section style={card}>
          <Text style={row}>
            <strong>Service</strong>
            <br />
            {service}
          </Text>
          <Text style={row}>
            <strong>When</strong>
            <br />
            {visitDate}
            {visitWindow ? ` · ${visitWindow}` : ''}
          </Text>
          {address ? (
            <Text style={row}>
              <strong>Address</strong>
              <br />
              {address}
            </Text>
          ) : null}
          {techName ? (
            <Text style={row}>
              <strong>Your tech</strong>
              <br />
              {techName}
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
          Need to reschedule? Call or text us at{' '}
          <Link href="tel:+18176637665" style={link}>
            817-663-POOL

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

export default VisitReminderEmail

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
  component: VisitReminderEmail,
  displayName: 'Appointment reminder (24h)',
  subject: (data: Record<string, any>) =>
    `Reminder — ${data.service ?? 'pool service'} tomorrow`,
  previewData: {
    name: 'Marcus',
    service: 'Weekly pool cleaning',
    visitDate: 'Fri, Aug 14',
    visitWindow: 'Morning (8am – 12pm)',
    address: '1201 Legacy Dr, Frisco, TX',
    techName: 'Diego R.',
    notes: 'Gate code 4412 — dog in the yard.',
  },
}
