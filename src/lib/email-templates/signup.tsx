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

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  confirmationUrl,
}: SignupEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Confirm your email for {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Confirm your email</Heading>
        <Text style={text}>
          Thanks for signing up for{' '}
          <Link href={siteUrl} style={link}>
            <strong>{siteName}</strong>
          </Link>
          !
        </Text>
        <Text style={text}>
          Please confirm your email address (
          <Link href={`mailto:${recipient}`} style={link}>
            {recipient}
          </Link>
          ) by clicking the button below:
        </Text>
        <Button style={button} href={confirmationUrl}>
          Verify Email
        </Button>
        <Text style={footer}>
          If you didn't create an account, you can safely ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

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
