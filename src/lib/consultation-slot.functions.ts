/**
 * Saves the consultation day and window picked on the thank you page.
 *
 * Open to the visitor who just submitted, so it only accepts a reference from
 * the last few days and only a day and window we actually offered.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { findConsultChoice } from "@/lib/consultation-slots";

export const setConsultationSlot = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({
        reference: z.string().trim().min(3).max(60),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        slot: z.string().trim().min(2).max(30),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const choice = findConsultChoice(data.date, data.slot);
    if (!choice) {
      return { ok: false as const, reason: "unavailable" as const };
    }

    const { saveConsultationSlot } = await import("@/lib/consultation-slot.server");
    const prettyDate = new Date(`${choice.day.date}T12:00:00Z`).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      timeZone: "UTC",
    });

    const result = await saveConsultationSlot({
      reference: data.reference,
      date: choice.day.date,
      window: `${choice.slot.label} arrival`,
      sameDay: choice.day.sameDay,
      prettyDate,
    });

    if (!result.ok) return { ok: false as const, reason: "not_found" as const };
    return {
      ok: true as const,
      prettyDate,
      window: `${choice.slot.label}, ${choice.slot.detail}`,
      sameDay: choice.day.sameDay,
    };
  });
