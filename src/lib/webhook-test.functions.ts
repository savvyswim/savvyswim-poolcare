import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { SimulateInput } from "@/lib/webhook-test.server";

export const simulateAppointmentWebhook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: SimulateInput) => input)
  .handler(async ({ data, context }) => {
    const { data: isOffice } = await context.supabase.rpc("ss_is_office");
    if (!isOffice) throw new Error("Forbidden");

    const { getRequest } = await import("@tanstack/react-start/server");
    const req = getRequest();
    const origin = new URL(req.url).origin;

    const { runWebhookSimulation } = await import("@/lib/webhook-test.server");
    return runWebhookSimulation(
      {
        status: String(data.status || "on_the_way"),
        email: data.email?.trim() || null,
        phone: data.phone?.trim() || null,
        customerName: data.customerName?.trim() || "Test Customer",
        technician: data.technician?.trim() || null,
        arrivalWindow: data.arrivalWindow?.trim() || null,
        scheduledDate: data.scheduledDate?.trim() || null,
        message: data.message?.trim() || null,
        channels: Array.isArray(data.channels) ? data.channels.slice(0, 2) : [],
        auth: data.auth === "bearer" || data.auth === "none" ? data.auth : "signature",
      },
      origin,
    );
  });
