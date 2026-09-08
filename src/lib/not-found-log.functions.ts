import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { NotFoundReport } from "./not-found-log.server";

const hitSchema = z.object({
  path: z.string().min(1).max(300),
  fullUrl: z.string().max(600).nullish(),
  referrer: z.string().max(600).nullish(),
});

/** Public: called by the 404 page itself, so any visitor can reach it. */
export const logNotFound = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => hitSchema.parse(data))
  .handler(async ({ data }) => {
    const { getRequest } = await import("@tanstack/react-start/server");
    const { recordNotFound } = await import("./not-found-log.server");
    let userAgent: string | null = null;
    let ip: string | null = null;
    try {
      const request = getRequest();
      userAgent = request.headers.get("user-agent");
      ip =
        request.headers.get("cf-connecting-ip") ??
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        null;
    } catch {
      /* header access is best-effort */
    }
    await recordNotFound({
      path: data.path,
      fullUrl: data.fullUrl ?? null,
      referrer: data.referrer ?? null,
      source: "client",
      userAgent,
      ip,
    });
    return { ok: true } as const;
  });

/** Office/owner only, verified server-side, never trusted from the client. */
export const getNotFoundReport = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<NotFoundReport> => {
    const { data: isOffice } = await (
      context.supabase as unknown as { rpc: (fn: "ss_is_office") => Promise<{ data: unknown }> }
    ).rpc("ss_is_office");
    if (isOffice !== true) throw new Error("Office access required");
    const { buildNotFoundReport } = await import("./not-found-log.server");
    return buildNotFoundReport();
  });
