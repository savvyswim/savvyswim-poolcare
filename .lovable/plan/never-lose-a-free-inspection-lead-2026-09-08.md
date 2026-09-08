# Never lose a free-inspection lead

Google's own listing inbox cannot be fed from a website. Only things Google itself creates (calls from the listing, Google messages, direction taps) show up there. So instead of pretending, this makes leads land where you actually read them and tags the ones that came from Google.

## 1. Every lead lands in your Gmail inbox

- Connect your Google Mail account so each free-inspection and water-test request is delivered straight into marcus@santanariveragroup.com as a real email in that mailbox, with the customer's name, phone, address, pool details and the page they came from.
- The email is addressed so you can hit Reply and the homeowner receives it.
- This runs in addition to the existing alert email and the CRM hand-off, so if one path fails the other still delivers.
- If Gmail delivery ever fails, the failure is recorded and shows on the admin Lead sync page with a Resend button (that page already has resend for the other two paths).

## 2. See which leads came from Google

- Your Google listing website link gets a tag on the end so visitors arriving from Google are recorded as "Google Business".
- The admin Leads page gets a simple source line and count so you can see Google leads at a glance.
- You'll get the exact tagged link to paste into the listing's website field.

## 3. Small fix found while checking

An email template currently prints a stray comma where a blank value should appear (leftover from the dash cleanup). That gets corrected.

## What this cannot do

Nothing can push a website form into Google's listing inbox or make website leads appear in local listings. Google exposes no way to write them. Calls, Google messages and direction taps generated on the listing will keep showing there on their own.

## Technical notes

- Use the `google_mail` connector (workspace/builder account) through the connector gateway; send with `users/me/messages/send` from a server-side helper, never from the browser.
- New `src/lib/gmail-lead-inbox.server.ts` builds the RFC 2822 message (base64url, RFC 2047 for the subject) and is called from the existing lead notification path in `src/lib/inspection-notify.server.ts` / the `/api/public/leads` background work, non-blocking.
- Log each attempt as an event row keyed by `request_id` so `src/lib/lead-sync.server.ts` can report `sent` / `failed` / `pending` and `resendLeadEmails` can retry it.
- `channelOf` in `src/lib/lead-sources.server.ts` already maps `google_business` / `gbp`; surface the rollup on `src/routes/admin/leads.tsx`.
- Fix the `esc()` fallback in `src/lib/inspection-notify.server.ts` from `", "` to an empty string.
- Verify with typecheck, tests, and a live test lead end to end.
