/** Derived e-sign lifecycle status shown on every contract card. */
export type EsignStatus =
  | "draft"
  | "sent"
  | "viewed"
  | "in_progress"
  | "signed"
  | "expired"
  | "declined"
  | "voided";

export type EsignSource = {
  status: string;
  sent_at?: string | null;
  viewed_at?: string | null;
  signing_started_at?: string | null;
  signed_at?: string | null;
  expires_at?: string | null;
};

export const ESIGN_LABEL: Record<EsignStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  viewed: "Viewed",
  in_progress: "In progress",
  signed: "Signed",
  expired: "Expired",
  declined: "Declined",
  voided: "Voided",
};

export const ESIGN_TONE: Record<EsignStatus, "green" | "aqua" | "gold" | "orange" | "burgundy"> = {
  draft: "gold",
  sent: "aqua",
  viewed: "orange",
  in_progress: "orange",
  signed: "green",
  expired: "burgundy",
  declined: "burgundy",
  voided: "burgundy",
};

/**
 * The stored status can lag reality (a link expires on the clock, not on a
 * write), so the badge is derived from the timestamps every render.
 */
export function esignStatus(c: EsignSource): EsignStatus {
  if (c.status === "signed" || c.signed_at) return "signed";
  if (c.status === "declined") return "declined";
  if (c.status === "voided") return "voided";
  if (c.status === "expired") return "expired";
  if (c.expires_at && new Date(c.expires_at).getTime() < Date.now()) return "expired";
  if (c.status === "in_progress" || c.signing_started_at) return "in_progress";
  if (c.status === "viewed" || c.viewed_at) return "viewed";
  if (c.status === "sent" || c.sent_at) return "sent";
  return "draft";
}

/** Plain-language note under the badge, e.g. "Expires in 12 days". */
export function esignNote(c: EsignSource): string | null {
  const s = esignStatus(c);
  if (s === "signed" || s === "declined" || s === "voided") return null;
  if (s === "expired") return "Signing link expired — resend to reopen it";
  if (!c.expires_at) return null;
  const days = Math.ceil((new Date(c.expires_at).getTime() - Date.now()) / 86_400_000);
  if (days <= 0) return "Expires today";
  return `Expires in ${days} day${days === 1 ? "" : "s"}`;
}
