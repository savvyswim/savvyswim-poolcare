/**
 * /offer, the paid social landing page for Meta ads. Kept out of search
 * results and out of the sitemap: it is an ad destination, not a search page.
 */
import { createFileRoute } from "@tanstack/react-router";
import AdOffer from "@/pages/AdOffer";
import { SITE_URL } from "@/lib/structured-data";

const TITLE = "Free Pool Inspection in DFW | Savvy Swim";
const DESC =
  "Switch to Savvy Swim and your first pool inspection is free. Full water test, full system check and a written report across Dallas-Fort Worth, no commitment.";
const URL = `${SITE_URL}/offer`;

type OfferSearch = {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  ref?: string;
};

const str = (value: unknown, max: number): string | undefined => {
  if (typeof value !== "string") return undefined;
  const clean = value.trim().slice(0, max);
  return clean || undefined;
};

export const Route = createFileRoute("/offer")({
  validateSearch: (search: Record<string, unknown>): OfferSearch => {
    const out: OfferSearch = {};
    const utmSource = str(search["utm_source"], 60);
    if (utmSource) out.utm_source = utmSource;
    const utmMedium = str(search["utm_medium"], 60);
    if (utmMedium) out.utm_medium = utmMedium;
    const utmCampaign = str(search["utm_campaign"], 120);
    if (utmCampaign) out.utm_campaign = utmCampaign;
    const ref = str(search["ref"], 40);
    if (ref) out.ref = ref;
    return out;
  },

  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { name: "robots", content: "noindex, follow" },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { property: "og:url", content: URL },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESC },
    ],
  }),
  component: AdOffer,
});
