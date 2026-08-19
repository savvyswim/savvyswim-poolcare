/**
 * Shared-secret guard for internal ops automation endpoints under
 * /api/public/hooks/* (canary, health-watch, failure-rate-watch,
 * visit-reminders, low-stock-watch).
 *
 * These routes trigger real outbound email/SMS, so they must never run for an
 * anonymous caller. The caller proves it holds OPS_HOOK_SECRET (falling back to
 * CRM_WEBHOOK_SECRET so existing cron jobs keep working) with any of:
 *
 *   Authorization: Bearer <secret>
 *   x-ops-secret: <secret>
 *   ?k=<secret>
 */
import { timingSafeEqual } from "node:crypto";

function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export function opsSecret(): string | null {
  return process.env["OPS_HOOK_SECRET"] ?? process.env["CRM_WEBHOOK_SECRET"] ?? null;
}

/** True when the request carries the ops shared secret. */
export function isOpsAuthorized(request: Request): boolean {
  const secret = opsSecret();
  if (!secret) return false;
  const presented = [
    (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim(),
    (request.headers.get("x-ops-secret") ?? "").trim(),
    (new URL(request.url).searchParams.get("k") ?? "").trim(),
  ].filter((v) => v.length > 0);
  return presented.some((v) => safeEqual(v, secret));
}

/**
 * Returns a 401/503 Response when the caller is not authorized, or null when
 * the handler may proceed.
 */
export function guardOpsHook(request: Request, tag: string): Response | null {
  if (!opsSecret()) {
    console.error(`[${tag}] OPS_HOOK_SECRET is not configured — refusing to run`);
    recordRejection(tag, 503, "ops secret not configured");
    return Response.json({ error: "not configured" }, { status: 503 });
  }
  if (!isOpsAuthorized(request)) {
    recordRejection(tag, 401, "missing or invalid ops secret");
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  return null;
}

/** Fire-and-forget: rejections feed the webhook failure watchdog. */
function recordRejection(tag: string, status: number, reason: string): void {
  void (async () => {
    try {
      const { logWebhookRejection } = await import("@/lib/webhook-log.server");
      await logWebhookRejection({
        channel: "ops",
        endpoint: `/api/public/hooks/${tag}`,
        status,
        reason,
      });
    } catch {
      /* logging is best effort */
    }
  })();
}
