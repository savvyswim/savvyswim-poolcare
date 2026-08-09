/** Shared sender identity for every customer-facing Savvy Swim email. */
export const REPLY_TO_ADDRESS = "hi@savvyswim.com";
export const SENDER_DOMAIN = "notify.savvyswim.com";
export const FROM_ADDRESS = `Savvy Swim <noreply@${SENDER_DOMAIN}>`;
export const REPLY_TO_SETTINGS_KEY = "reply_to_routing";

export type ReplyToRoutingSettings = {
  /** Address customers reply to. Must be a live mailbox. */
  address: string;
  /** Where the bounce alert goes. Blank = the office notification list. */
  alert_email: string;
  /** Send an alert email when replies are bouncing. */
  alert_enabled: boolean;
  /** Look-back window used by the check, in days. */
  window_days: number;
  last_checked_at?: string | null;
  last_status?: "ok" | "warning" | "failing" | null;
};

export const DEFAULT_REPLY_TO_SETTINGS: ReplyToRoutingSettings = {
  address: REPLY_TO_ADDRESS,
  alert_email: "",
  alert_enabled: true,
  window_days: 30,
  last_checked_at: null,
  last_status: null,
};
