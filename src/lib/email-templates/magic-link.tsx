import * as React from 'react'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from '@react-email/components'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({
  siteName,
  confirmationUrl,
}: MagicLinkEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your login link for {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Your login link</Heading>
        <Text style={text}>
          Click the button below to log in to {siteName}. This link will expire
          shortly.
        </Text>
        <Button style={button} href={confirmationUrl}>
          Log In
        </Button>
        <Text style={footer}>
          If you didn't request this link, you can safely ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default MagicLinkEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", padding: '24px 0' }
const container = {
  padding: '32px 28px',
  maxWidth: '560px',
  backgroundColor: '#F4EFE3',
  border: '1px solid rgba(142, 31, 44, 0.25)',
  borderRadius: '0',
}
const h1 = {
  fontSize: '26px',
  fontWeight: 'bold' as const,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.02em',
  lineHeight: '1.05',
  color: '#8E1F2C',
  margin: '0 0 20px',
}
const text = {
  fontSize: '15px',
  color: '#2a1013',
  lineHeight: '1.6',
  margin: '0 0 24px',
}
const button = {
  backgroundColor: '#8E1F2C',
  color: '#F4EFE3',
  fontSize: '13px',
  fontWeight: 'bold' as const,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.12em',
  borderRadius: '0',
  padding: '14px 26px',
  textDecoration: 'none',
  display: 'inline-block',
}
const footer = {
  fontSize: '12px',
  color: 'rgba(42, 16, 19, 0.6)',
  borderTop: '1px solid rgba(142, 31, 44, 0.2)',
  paddingTop: '16px',
  margin: '32px 0 0',
}
