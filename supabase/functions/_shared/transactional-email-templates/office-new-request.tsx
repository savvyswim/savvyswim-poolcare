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

export interface OfficeNewRequestProps {
  requestType: string
  name: string
  email: string
  phone?: string
  address?: string
  service: string
  preferredDate?: string
  preferredTime?: string
  notes?: string
  submittedAt?: string
  sourceUrl?: string
}

export const OfficeNewRequestEmail = ({
  requestType,
  name,
  email,
  phone,
  address,
  service,
  preferredDate,
  preferredTime,
  notes,
  submittedAt,
  sourceUrl,
}: OfficeNewRequestProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>
      {requestType}: {name} — {service}
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={eyebrow}>SAVVY SWIM · OFFICE ALERT</Text>
        <Heading style={h1}>{requestType}</Heading>
        <Text style={text}>
          A new request just came in from the website. Follow up from the CRM
          pipeline.
        </Text>

        <Section style={card}>
          <Text style={row}>
            <strong>Customer</strong>
            <br />
            {name}
          </Text>
          <Text style={row}>
            <strong>Contact</strong>
            <br />
            <Link href={`mailto:${email}`} style={link}>
              {email}
            </Link>
            {phone ? (
              <>
                {' · '}
                <Link href={`tel:${phone}`} style={link}>
                  {phone}
                </Link>
              </>
            ) : null}
          </Text>
          <Text style={row}>
            <strong>Service requested</strong>
            <br />
            {service}
          </Text>
          {preferredDate || preferredTime ? (
            <Text style={row}>
              <strong>Preferred window</strong>
              <br />
              {[preferredDate, preferredTime].filter(Boolean).join(' · ')}
            </Text>
          ) : null}
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
          {submittedAt ? (
            <Text style={row}>
              <strong>Submitted</strong>
              <br />
              {submittedAt}
            </Text>
          ) : null}
        </Section>

        <Text style={text}>
          <Link href="https://www.savvyswim.com/admin/crm/pipeline" style={link}>
            Open the CRM pipeline →
          </Link>
        </Text>

        <Hr style={hr} />
        <Text style={footer}>
          Sent automatically by the Savvy Swim website
          {sourceUrl ? ` · ${sourceUrl}` : ''}
        </Text>
      </Container>
    </Body>
  </Html>
)

export default OfficeNewRequestEmail

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
  component: OfficeNewRequestEmail,
  displayName: 'Office alert — new request',
  subject: (data: Record<string, any>) =>
    `${data.requestType ?? 'New request'} — ${data.name ?? 'Website visitor'}`,
  previewData: {
    requestType: 'New booking request',
    name: 'Marcus Rivera',
    email: 'marcus@example.com',
    phone: '(469) 744-0379',
    address: '1201 Legacy Dr, Frisco, TX',
    service: 'Weekly pool cleaning',
    preferredDate: 'Fri, Aug 14, 2026',
    preferredTime: 'Morning (8am – 12pm)',
    notes: 'Gate code 4412 — dog in the yard.',
    submittedAt: 'Aug 5, 2026 · 1:42 PM CT',
  },
}
