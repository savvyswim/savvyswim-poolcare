import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  DEFAULT_REPLY_TO_SETTINGS,
  FROM_ADDRESS,
  REPLY_TO_ADDRESS,
  REPLY_TO_SETTINGS_KEY,
  SENDER_DOMAIN,
  type ReplyToRoutingSettings,
} from "@/lib/email-config";

export type ReplyToCheckItem = {
  id: string;
  label: string;
  status: "ok" | "warning" | "fail";
  detail: string;
};

export type ReplyToCheckResult = {
  address: string;
  status: "ok" | "warning" | "failing";
  checkedAt: string;
  items: ReplyToCheckItem[];
  bounces: { timestamp: string; event_type: string; status?: string }[];
  alerted: boolean;
};

/** Ask public DNS whether a domain can actually receive mail. */
async function lookupMx(domain: string): Promise<string[]> {
  const res = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=MX`, {
    headers: { accept: "application/dns-json" },
  });
  if (!res.ok) throw new Error(`DNS lookup failed (${res.status})`);
  const json = (await res.json()) as { Answer?: { type: number; data: string }[] };
  return (json.Answer ?? []).filter((a) => a.type === 15).map((a) => a.data);
}

/**
 * Verifies that hi@savvyswim.com (or whatever reply-to is configured) is a real,
 * reachable mailbox and that nothing sent to it has bounced or been suppressed.
 * Owner-only; optionally emails an alert when the routing looks broken.
 */
export const checkReplyToRouting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ notify: z.boolean().optional() }).parse(data ?? {}))
  .handler(async ({ data, context }): Promise<ReplyToCheckResult> => {
    const { supabase } = context;

    const { data: isOwner } = await supabase.rpc("ss_is_owner");
    if (!isOwner) throw new Error("Only the owner can run the reply-to check");

    const { data: row } = await supabase
      .from("ss_settings")
      .select("value")
      .eq("key", REPLY_TO_SETTINGS_KEY)
      .maybeSingle();

    const settings: ReplyToRoutingSettings = {
      ...DEFAULT_REPLY_TO_SETTINGS,
      ...((row?.value as Partial<ReplyToRoutingSettings> | null) ?? {}),
    };
    const address = (settings.address || REPLY_TO_ADDRESS).trim().toLowerCase();
    const domain = address.split("@")[1] ?? "";
    const items: ReplyToCheckItem[] = [];

    // 1 · The app must actually stamp this address on outgoing mail.
    items.push(
      address === REPLY_TO_ADDRESS
        ? {
            id: "wiring",
            label: "Reply-to used by the app",
            status: "ok",
            detail: `Customer emails go out as ${FROM_ADDRESS} with Reply-To: ${address}.`,
          }
        : {
            id: "wiring",
            label: "Reply-to used by the app",
            status: "warning",
            detail: `Settings say ${address}, but outgoing mail is stamped ${REPLY_TO_ADDRESS}. Update the setting or ask me to change the code.`,
          },
    );

    // 2 · The mailbox domain must have MX records, or every reply bounces.
    try {
      const mx = await lookupMx(domain);
      items.push(
        mx.length
          ? {
              id: "mx",
              label: "Mailbox can receive mail",
              status: "ok",
              detail: `${domain} has ${mx.length} MX record${mx.length === 1 ? "" : "s"} (${mx
                .slice(0, 3)
                .join(", ")}).`,
            }
          : {
              id: "mx",
              label: "Mailbox can receive mail",
              status: "fail",
              detail: `${domain} has no MX records — every reply customers send will bounce. Add Google Workspace MX records on ${domain}.`,
            },
      );
    } catch (e) {
      items.push({
        id: "mx",
        label: "Mailbox can receive mail",
        status: "warning",
        detail: e instanceof Error ? e.message : "DNS lookup failed",
      });
    }

    // 3 · Nothing we send to the reply-to address may be bouncing or suppressed.
    const bounces: ReplyToCheckResult["bounces"] = [];
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (apiKey) {
      try {
        const { listEmailLogs } = await import("@lovable.dev/email-js");
        const since = new Date(
          Date.now() - Math.max(1, settings.window_days) * 24 * 60 * 60 * 1000,
        ).toISOString();
        const logs = await listEmailLogs({ recipient: address, since, limit: 100 }, { apiKey });
        for (const e of logs.data ?? []) {
          if (["bounced", "complained", "suppressed", "rejected"].includes(e.event_type)) {
            bounces.push({
              timestamp: e.timestamp,
              event_type: e.event_type,
              ...(e.status ? { status: e.status } : {}),
            });
          }
        }
        items.push(
          bounces.length === 0
            ? {
                id: "delivery",
                label: "Delivery history",
                status: "ok",
                detail: `No bounces, complaints or blocks to ${address} in the last ${settings.window_days} days.`,
              }
            : {
                id: "delivery",
                label: "Delivery history",
                status: "fail",
                detail: `${bounces.length} delivery failure${
                  bounces.length === 1 ? "" : "s"
                } to ${address} in the last ${settings.window_days} days.`,
              },
        );
      } catch (e) {
        items.push({
          id: "delivery",
          label: "Delivery history",
          status: "warning",
          detail: e instanceof Error ? e.message : "Could not read delivery history",
        });
      }
    } else {
      items.push({
        id: "delivery",
        label: "Delivery history",
        status: "warning",
        detail: "Email sending is not configured on this environment.",
      });
    }

    const status: ReplyToCheckResult["status"] = items.some((i) => i.status === "fail")
      ? "failing"
      : items.some((i) => i.status === "warning")
        ? "warning"
        : "ok";
    const checkedAt = new Date().toISOString();

    // Alert the owner when replies would bounce.
    let alerted = false;
    if (status === "failing" && settings.alert_enabled && data.notify !== false && apiKey) {
      let to = settings.alert_email.trim();
      if (!to) {
        const { data: officeRow } = await supabase
          .from("ss_settings")
          .select("value")
          .eq("key", "office_notification_emails")
          .maybeSingle();
        const list = officeRow?.value as unknown;
        if (Array.isArray(list) && typeof list[0] === "string") to = list[0] as string;
      }
      if (to) {
        try {
          const failing = items.filter((i) => i.status === "fail");
          const html = `<div style="font-family:Arial,Helvetica,sans-serif;color:#2b2b2b;">
  <h2 style="color:#8E1F2C;margin:0 0 12px;">Customer replies to ${address} are failing</h2>
  <ul style="padding-left:18px;line-height:1.6;">
    ${failing.map((i) => `<li><strong>${i.label}:</strong> ${i.detail}</li>`).join("")}
  </ul>
  <p style="font-size:12px;color:#7a6f63;">Checked ${new Date(checkedAt).toLocaleString("en-US", {
    timeZone: "America/Chicago",
  })} CT · Savvy Swim CRM → Settings</p>
</div>`;
          const text = `Customer replies to ${address} are failing.\n\n${failing
            .map((i) => `- ${i.label}: ${i.detail}`)
            .join("\n")}`;
          const { sendLovableEmail } = await import("@lovable.dev/email-js");
          await sendLovableEmail(
            {
              to,
              from: FROM_ADDRESS,
              sender_domain: SENDER_DOMAIN,
              subject: `Reply-to routing problem: ${address}`,
              html,
              text,
              label: "reply-to-alert",
              purpose: "transactional",
              idempotency_key: `reply-to-alert-${address}-${checkedAt.slice(0, 13)}`,
            },
            { apiKey },
          );
          alerted = true;
        } catch (e) {
          console.error("reply-to alert failed", e);
        }
      }
    }

    await supabase
      .from("ss_settings")
      .upsert(
        {
          key: REPLY_TO_SETTINGS_KEY,
          value: { ...settings, address, last_checked_at: checkedAt, last_status: status } as never,
        },
        { onConflict: "key" },
      );

    return { address, status, checkedAt, items, bounces, alerted };
  });
