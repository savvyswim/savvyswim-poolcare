/** CRM pipeline: Enquiry, Quote, Booking, Won (plus Lost). Browser-safe. */
export const PIPELINE = ["enquiry", "quote", "booking", "won"] as const;
export type PipelineStage = (typeof PIPELINE)[number] | "lost";
export const PIPELINE_LABEL: Record<PipelineStage, string> = {
  enquiry: "Enquiry",
  quote: "Quote",
  booking: "Booking",
  won: "Won",
  lost: "Lost",
};

/** Maps a pipeline stage onto the CRM lead list's stage values. */
export const CRM_STAGE: Record<PipelineStage, "new_lead" | "quote_sent" | "follow_up" | "won" | "lost"> = {
  enquiry: "new_lead",
  quote: "quote_sent",
  booking: "follow_up",
  won: "won",
  lost: "lost",
};

export function derivePipeline(input: {
  status: string | null;
  convertedCustomerId: string | null;
  events: { event_type: string; status_to: string | null; created_at: string }[];
}): { stage: PipelineStage; manual: boolean } {
  const manual = [...input.events]
    .filter((e) => e.event_type === "pipeline_stage_set" && e.status_to)
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))[0];
  if (manual) return { stage: manual.status_to as PipelineStage, manual: true };
  if (input.status === "declined") return { stage: "lost", manual: false };
  if (input.status === "converted") return { stage: "won", manual: false };
  if (input.status === "scheduled" || input.status === "confirmed" || input.convertedCustomerId)
    return { stage: "booking", manual: false };
  if (input.events.some((e) => /email_sent|sms_sent|confirmation|reply/.test(e.event_type)))
    return { stage: "quote", manual: false };
  return { stage: "enquiry", manual: false };
}
