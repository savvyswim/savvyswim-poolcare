import { supabase } from "@/integrations/supabase/client";

export type ContactEventType = "call_click" | "text_click";

const SESSION_KEY = "savvy_session_id";

function getSessionId(): string {
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return "unknown";
  }
}

/**
 * Fire-and-forget logging of a click-to-call / click-to-text interaction.
 * Never blocks or breaks the tel:/sms: navigation.
 */
export function trackContactClick(eventType: ContactEventType, placement: string) {
  try {
    void supabase
      .from("contact_events")
      .insert({
        event_type: eventType,
        placement,
        page_path: window.location.pathname,
        referrer: document.referrer || null,
        session_id: getSessionId(),
        user_agent: navigator.userAgent,
      })
      .then(({ error }) => {
        if (error) console.warn("contact event not logged", error.message);
      });
  } catch (e) {
    console.warn("contact event not logged", e);
  }
}
