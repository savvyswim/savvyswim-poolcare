/**
 * Attribution-stamped activity log for inspection requests.
 *
 * Every notification we send and every status change we record is written with
 * a snapshot of the marketing attribution that produced the request, so the
 * whole lifecycle (ad click → form → alerts → scheduled → completed → won) can
 * be reported per campaign even if the request row is later edited.
 */

export type InspectionEventInput = {
  eventType:
    | "status_change"
    | "email_sent"
    | "email_failed"
    | "sms_sent"
    | "sms_failed"
    | "converted";
  channel?: string | null;
  recipient?: string | null;
  outcome?: string | null;
  detail?: string | null;
  statusFrom?: string | null;
  statusTo?: string | null;
};

/** Never throws, logging must not break the notification it is recording. */
export async function logInspectionEvents(
  requestId: string,
  events: InspectionEventInput[],
): Promise<void> {
  if (events.length === 0) return;
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: req } = await supabaseAdmin
      .from("inspection_requests")
      .select(
        "campaign_id, utm_source, utm_medium, utm_campaign, utm_content, landing_page, page_path, referrer, session_id",
      )
      .eq("id", requestId)
      .maybeSingle();

    const attribution = {
      campaign_id: req?.campaign_id ?? null,
      utm_source: req?.utm_source ?? null,
      utm_medium: req?.utm_medium ?? null,
      utm_campaign: req?.utm_campaign ?? null,
      utm_content: req?.utm_content ?? null,
      landing_page: req?.landing_page ?? null,
      page_path: req?.page_path ?? null,
      referrer: req?.referrer ?? null,
      session_id: req?.session_id ?? null,
    };

    await supabaseAdmin.from("inspection_events").insert(
      events.map((e) => ({
        request_id: requestId,
        event_type: e.eventType,
        channel: e.channel ?? null,
        recipient: e.recipient ?? null,
        outcome: e.outcome ?? null,
        detail: e.detail ?? null,
        status_from: e.statusFrom ?? null,
        status_to: e.statusTo ?? null,
        ...attribution,
      })),
    );
  } catch (e) {
    console.error("logInspectionEvents failed", (e as Error).message);
  }
}
