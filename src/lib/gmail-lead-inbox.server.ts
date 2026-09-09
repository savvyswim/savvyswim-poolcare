/**
 * Delivers every free-inspection / water-test lead straight into the connected
 * Gmail mailbox, on top of the transactional alert email and the CRM hand-off.
 *
 * Uses the Gmail connector through the Lovable connector gateway. Server-only:
 * both credentials are secrets and must never reach the browser.
 */

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_mail/gmail/v1";

/** Inbox that should receive a copy of every lead. */
export const GMAIL_LEAD_INBOX = "marcus@santanariveragroup.com";

const b64 = (s: string) =>
  btoa(Array.from(new TextEncoder().encode(s), (b) => String.fromCharCode(b)).join(""));

/** RFC 2047 encode a header value when it is not pure ASCII. */
const header = (v: string) => (/^[\x00-\x7F]*$/.test(v) ? v : `=?UTF-8?B?${b64(v)}?=`);

function rawMessage(opts: {
  to: string;
  replyTo?: string | null;
  subject: string;
  text: string;
}): string {
  const lines = [
    `To: ${opts.to}`,
    ...(opts.replyTo ? [`Reply-To: ${opts.replyTo}`] : []),
    `Subject: ${header(opts.subject)}`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
    "",
    opts.text,
  ];
  return b64(lines.join("\r\n")).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export type GmailLeadResult = { ok: true } | { ok: false; reason: string };

export async function sendLeadToGmailInbox(lead: {
  subject: string;
  text: string;
  replyTo?: string | null;
  to?: string;
}): Promise<GmailLeadResult> {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const gmailKey = process.env["GOOGLE_MAIL_API_KEY"];
  if (!lovableKey || !gmailKey) return { ok: false, reason: "gmail_not_configured" };

  const to = lead.to ?? GMAIL_LEAD_INBOX;

  try {
    const response = await fetch(`${GATEWAY_URL}/users/me/messages/send`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": gmailKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        raw: rawMessage({
          to,
          replyTo: lead.replyTo ?? null,
          subject: lead.subject,
          text: lead.text,
        }),
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      console.error(`[gmail-lead] send failed [${response.status}]: ${body}`);
      return { ok: false, reason: `gmail_${response.status}` };
    }
    return { ok: true };
  } catch (e) {
    console.error("[gmail-lead] send threw", (e as Error).message);
    return { ok: false, reason: "gmail_request_failed" };
  }
}
