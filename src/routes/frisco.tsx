import { createFileRoute } from "@tanstack/react-router";
import PoolCleaningFrisco from "@/pages/PoolCleaningFrisco";

const URL = "https://savvyswim.com/frisco";
/** All Frisco URLs serve the same page. One canonical keeps them from competing. */
const CANONICAL = "https://savvyswim.com/pool-cleaning-frisco-tx";
const TITLE = "Frisco Pool Service & Cleaning | Savvy Swim";
const DESCRIPTION =
  "Weekly Frisco pool service from $129.99/mo with chemicals, equipment checks, and a photo report after every visit.";

export const Route = createFileRoute("/frisco")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: URL },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
    ],
    links: [{ rel: "canonical", href: CANONICAL }],
  }),
  component: PoolCleaningFrisco,
});