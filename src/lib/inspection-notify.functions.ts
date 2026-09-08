import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Emails the office (and the homeowner) when a free-inspection or water-test
 * request comes in. Public on purpose. it accepts only a request id and reads
 * every detail from the database, so nothing a visitor types can be pushed
 * into staff inboxes.
 */
export const notifyInspectionRequest = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ requestId: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    const { sendInspectionNotifications } = await import("./inspection-notify.server");
    return sendInspectionNotifications(data.requestId);
  });
