import * as React from 'react'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
} from '@react-email/components'

interface EmailChangeEmailProps {
  siteName: string
  // oldEmail is the user's current address (HookData.OldEmail). For the
  // NEW-recipient half of a secure email_change fanout, `email` equals the
  // recipient (NEW), so the "from" line must render oldEmail to read
  // "from OLD to NEW" instead of "from NEW to NEW".
  oldEmail: string
  email: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({
  siteName,
  oldEmail,
  newEmail,
  confirmationUrl,
}: EmailChangeEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Confirm your email change for {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Confirm your email change</Heading>
        <Text style={text}>
          You requested to change your email address for {siteName} from{' '}
          <Link href={`mailto:${oldEmail}`} style={link}>
            {oldEmail}
          </Link>{' '}
          to{' '}
          <Link href={`mailto:${newEmail}`} style={link}>
            {newEmail}
          </Link>
          .
        </Text>
        <Text style={text}>
          Click the button below to confirm this change:
        </Text>
        <Button style={button} href={confirmationUrl}>
          Confirm Email Change
        </Button>
        <Text style={footer}>
          If you didn't request this change, please secure your account
          immediately.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default EmailChangeEmail

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
const link = { color: '#1FA9BE', textDecoration: 'underline' }
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
