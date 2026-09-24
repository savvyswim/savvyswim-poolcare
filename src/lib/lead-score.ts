/** Simple, visible lead score (0 to 100) and marketing channel. */
import { SERVICE_LOCATIONS } from "./service-locations";

export type ScoreInput = {
  email?: string | null;
  sms_opt_in?: boolean | null;
  preferred_date?: string | null;
  preferred_contact_time?: string | null;
  source?: string | null;
  lead_type?: string | null;
  address?: string | null;
  notes?: string | null;
  pool_details?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  page_path?: string | null;
  created_at?: string | null;
  replied?: boolean;
  reached?: boolean;
};

export function leadChannel(r: ScoreInput): string {
  const hay = `${r.utm_source ?? ""} ${r.utm_medium ?? ""}`.toLowerCase();
  const src = (r.source ?? "").toLowerCase();
  if (src === "crm_app") return "App";
  if (/facebook|instagram|meta|fb/.test(hay)) return "Meta ad";
  if (/gbp|business|maps/.test(hay)) return "Google Business";
  if (/google|cpc|ppc/.test(hay)) return "Google";
  if (src.includes("book")) return "Booking page";
  if (src.includes("survey")) return "Survey";
  if (src.includes("water")) return "Water test";
  if ((r.page_path ?? "").match(/^\/(pool-service|service-areas|[a-z-]+\/pricing)/)) return "City page";
  return "Direct";
}

export function scoreLead(r: ScoreInput): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let s = 0;
  const add = (n: number, why: string) => {
    s += n;
    reasons.push(`${n > 0 ? "+" : ""}${n} ${why}`);
  };
  if (r.email && !r.email.toLowerCase().startsWith("no-email.")) add(10, "gave a real email");
  if (r.sms_opt_in) add(10, "agreed to texts");
  if (r.preferred_date || r.preferred_contact_time) add(20, "picked a day or time");
  const src = (r.source ?? "").toLowerCase();
  if (src.includes("book") || src.includes("survey")) add(15, "booking page or survey done");
  const addr = (r.address ?? "").toLowerCase();
  if (SERVICE_LOCATIONS.some((c) => addr.includes(c.name.toLowerCase()))) add(15, "in a route city");
  const text = `${r.lead_type ?? ""} ${r.notes ?? ""} ${r.pool_details ?? ""}`.toLowerCase();
  if (/weekly|swim club|membership/.test(text)) add(15, "weekly service or Swim Club interest");
  const ch = leadChannel(r);
  if (ch === "Meta ad" || ch === "Google" || ch === "Google Business") add(5, `came from ${ch}`);
  if (r.replied) add(10, "replied to us");
  if (!r.reached && r.created_at && Date.now() - new Date(r.created_at).getTime() > 7 * 864e5) {
    add(-15, "not reached in 7 days");
  }
  return { score: Math.max(0, Math.min(100, s)), reasons };
}

export const scoreLabel = (n: number | null | undefined) =>
  n == null ? "Unscored" : n >= 70 ? "Hot" : n >= 40 ? "Warm" : "Cold";
