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

export interface ServiceReportMetric {
  label: string
  value: number | string | null
  unit?: string
  range: string
  status: 'good' | 'low' | 'high' | 'unknown'
  purpose?: string
}

export interface ServiceReportTreatment {
  chemical: string
  amount: string
  reason: string
}

export interface ServiceReportProps {
  name: string
  visitDate: string
  address?: string
  techName?: string
  minutes?: number
  summary: string
  allGood?: boolean
  metrics: ServiceReportMetric[]
  treatments?: ServiceReportTreatment[]
  tasksCompleted?: number
  notes?: string
}

const statusLabel = (s: ServiceReportMetric['status']) =>
  s === 'good' ? 'In range' : s === 'low' ? 'Low — corrected' : s === 'high' ? 'High — corrected' : 'Not tested'

const statusColor = (s: ServiceReportMetric['status']) =>
  s === 'good' ? '#1F7A4C' : s === 'unknown' ? '#6C7278' : '#8E1F2C'

export const ServiceReportEmail = ({
  name,
  visitDate,
  address,
  techName,
  minutes,
  summary,
  allGood,
  metrics,
  treatments = [],
  tasksCompleted,
  notes,
}: ServiceReportProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your pool report — {visitDate}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={eyebrow}>SAVVY SWIM · POOL SERVICE REPORT</Text>
        <Heading style={h1}>
          {allGood ? 'Your water is balanced.' : 'Service complete — water corrected.'}
        </Heading>
        <Text style={text}>
          Hi {name} — here's exactly what we tested and treated on {visitDate}
          {address ? ` at ${address}` : ''}.
        </Text>

        <Section style={card}>
          <Text style={{ ...row, margin: 0 }}>{summary}</Text>
        </Section>

        <Text style={sectionTitle}>WATER CHEMISTRY</Text>
        <Section style={table}>
          <Row style={theadRow}>
            <Column style={{ ...th, width: '38%' }}>Metric</Column>
            <Column style={{ ...th, width: '20%' }}>Reading</Column>
            <Column style={{ ...th, width: '22%' }}>Target</Column>
            <Column style={{ ...th, width: '20%' }}>Status</Column>
          </Row>
          {metrics.map((m) => (
            <Row key={m.label} style={tr}>
              <Column style={td}>
                <strong>{m.label}</strong>
                {m.purpose ? <span style={muted}> · {m.purpose}</span> : null}
              </Column>
              <Column style={td}>
                {m.value === null || m.value === undefined ? '—' : `${m.value}${m.unit ? ` ${m.unit}` : ''}`}
              </Column>
              <Column style={td}>{m.range}</Column>
              <Column style={{ ...td, color: statusColor(m.status), fontWeight: 600 as const }}>
                {statusLabel(m.status)}
              </Column>
            </Row>
          ))}
        </Section>

        {treatments.length ? (
          <>
            <Text style={sectionTitle}>CHEMICALS ADDED TODAY</Text>
            <Section style={card}>
              {treatments.map((t, i) => (
                <Text key={i} style={row}>
                  <strong>
                    {t.chemical} — {t.amount}
                  </strong>
                  <br />
                  <span style={muted}>{t.reason}</span>
                </Text>
              ))}
            </Section>
          </>
        ) : (
          <Section style={card}>
            <Text style={{ ...row, margin: 0 }}>
              No chemical corrections were needed — every tested level was already inside target.
            </Text>
          </Section>
        )}

        <Section style={card}>
          {techName ? (
            <Text style={row}>
              <strong>Your tech</strong>
              <br />
              {techName}
            </Text>
          ) : null}
          {typeof tasksCompleted === 'number' ? (
            <Text style={row}>
              <strong>Work completed</strong>
              <br />
              {tasksCompleted} checklist item{tasksCompleted === 1 ? '' : 's'}
              {minutes ? ` · ${minutes} minutes on site` : ''}
            </Text>
          ) : null}
          {notes ? (
            <Text style={{ ...row, margin: 0 }}>
              <strong>Notes from the visit</strong>
              <br />
              {notes}
            </Text>
          ) : null}
        </Section>

        <Text style={text}>
          Questions about your report? Call or text{' '}
          <Link href="tel:+14697440379" style={link}>
            (469) 744-0379
          </Link>
          .
        </Text>

        <Hr style={hr} />
        <Text style={footer}>
          Savvy Swim · Clear Water Guarantee — if your water isn't clear after a visit, we come
          back free, same day.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default ServiceReportEmail

const main = {
  backgroundColor: '#F4EFE3',
  fontFamily: "'Helvetica Neue', Arial, sans-serif",
  padding: '24px 0',
}
const container = {
  backgroundColor: '#FFFFFF',
  padding: '32px 28px',
  maxWidth: '600px',
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
const sectionTitle = {
  fontSize: '11px',
  letterSpacing: '0.16em',
  color: '#12232E',
  margin: '24px 0 10px',
  fontWeight: 700 as const,
}
const card = {
  backgroundColor: '#F4EFE3',
  padding: '18px 20px',
  margin: '0 0 6px',
  borderLeft: '3px solid #1FA9BE',
}
const row = { fontSize: '14px', color: '#12232E', lineHeight: '1.5', margin: '0 0 12px' }
const muted = { color: '#6C7278', fontSize: '13px' }
const table = { border: '1px solid #E4DCCB', margin: '0 0 6px' }
const theadRow = { backgroundColor: '#12232E' }
const th = {
  fontSize: '11px',
  letterSpacing: '0.08em',
  color: '#FFFFFF',
  padding: '8px 10px',
  textAlign: 'left' as const,
}
const tr = { borderTop: '1px solid #E4DCCB' }
const td = { fontSize: '13px', color: '#12232E', padding: '9px 10px', verticalAlign: 'top' as const }
const link = { color: '#8E1F2C' }
const hr = { borderColor: '#E4DCCB', margin: '24px 0 16px' }
const footer = { fontSize: '12px', color: '#6C7278', lineHeight: '1.5', margin: 0 }

export const template: TemplateEntry = {
  component: ServiceReportEmail,
  displayName: 'Pool service report',
  subject: (data: Record<string, any>) => `Your pool report — ${data.visitDate ?? 'today'}`,
  previewData: {
    name: 'Marcus',
    visitDate: 'Thu, Aug 6',
    address: '1201 Legacy Dr, Frisco, TX',
    techName: 'Diego R.',
    minutes: 38,
    summary: '2 levels outside target — corrected on site.',
    allGood: false,
    tasksCompleted: 7,
    metrics: [
      { label: 'Chlorine', value: 0.6, unit: 'ppm', range: '1–3 ppm', status: 'low', purpose: 'Sanitation' },
      { label: 'pH', value: 7.9, range: '7.4–7.6', status: 'high', purpose: 'Comfort & equipment' },
      { label: 'Alkalinity', value: 95, unit: 'ppm', range: '80–120 ppm', status: 'good', purpose: 'Stability' },
    ],
    treatments: [
      {
        chemical: 'Liquid chlorine 12.5%',
        amount: '22.5 oz',
        reason: 'Free chlorine 0.6 ppm is below the 1–3 ppm sanitation range.',
      },
      {
        chemical: 'Muriatic acid 31.45%',
        amount: '32 oz',
        reason: 'pH 7.9 is above 7.6 — scaling and cloudy water risk.',
      },
    ],
    notes: 'Brushed steps and emptied both skimmer baskets.',
  },
}
