import { supabase } from "@/integrations/supabase/client";
import { classifyError } from "@/crm/lib/retry";

/**
 * Automatic CRM error reporting. Whenever a CRM screen fails we file the
 * message, stack, route and a little context so the office can see what
 * broke without the tech having to describe it.
 */
export type CrmErrorContext = Record<string, unknown>;

const recent = new Map<string, number>();
const DEDUPE_MS = 30_000;

export async function reportCrmError(error: unknown, context: CrmErrorContext = {}) {
  try {
    const err = error instanceof Error ? error : new Error(String(error));
    const route = typeof window !== "undefined" ? window.location.pathname : null;
    const fingerprint = `${route}::${err.message}`;
    const now = Date.now();
    const last = recent.get(fingerprint);
    if (last && now - last < DEDUPE_MS) return;
    recent.set(fingerprint, now);

    const { data: auth } = await supabase.auth.getUser();

    await supabase.from("ss_client_errors").insert({
      user_id: auth?.user?.id ?? null,
      surface: "crm",
      route,
      message: err.message.slice(0, 500),
      stack: (err.stack ?? "").slice(0, 4000),
      context: {
        ...context,
        kind: classifyError(error),
        search: typeof window !== "undefined" ? window.location.search : null,
      } as never,
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 300) : null,
    });
  } catch {
    // Reporting must never be the reason a page stays broken.
  }
}
