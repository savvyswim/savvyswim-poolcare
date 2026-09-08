import { SwimClubPrompt } from "@/components/SwimClubPrompt";
import { goToLead } from "@/lib/site-analytics";

/**
 * Mounts the new-customer offer card site-wide and points its Join button at
 * the on-site quote form, tagged so the lead is attributed to the offer.
 */
export default function SwimClubPromptHost() {
  return <SwimClubPrompt onJoin={() => goToLead("swim_club_prompt")} />;
}
