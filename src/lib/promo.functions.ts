import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Discount / referral code validation for the free inspection form.
 *
 * The lookup function is service-role only, so validation always runs on the
 * server. An unknown code never blocks a lead. it is flagged so the office
 * can follow up.
 */

export type PromoStatus = "empty" | "valid" | "unknown" | "expired" | "inactive" | "used_up";

export interface PromoCheck {
  status: PromoStatus;
  code: string | null;
  /** "promo" | "referral" when we recognised it. */
  kind: string | null;
  /** Human readable value, e.g. "15% off". */
  detail?: string | null;
  message: string | null;
}

const CodeSchema = z.object({ code: z.string().trim().max(40) });

/** Server-side lookup shared by the public API route and the client check. */
export async function lookupPromoCode(code: string): Promise<PromoCheck> {
  const trimmed = (code ?? "").trim();
  if (!trimmed) return { status: "empty", code: null, kind: null, message: null };

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await (
    supabaseAdmin as unknown as {
      rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;
    }
  ).rpc("ss_validate_lead_code", { _code: trimmed });

  if (error) {
    console.error("promo code lookup failed", error.message);
    return {
      status: "unknown",
      code: trimmed.toUpperCase(),
      kind: null,
      message: "We could not check that code right now, send it and we'll apply it manually.",
    };
  }

  return data as PromoCheck;
}

export const checkPromoCode = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => CodeSchema.parse(input))
  .handler(async ({ data }): Promise<PromoCheck> => lookupPromoCode(data.code));
