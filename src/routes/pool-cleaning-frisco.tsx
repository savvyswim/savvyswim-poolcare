import { createFileRoute } from "@tanstack/react-router";
import PoolCleaningFrisco from "@/pages/PoolCleaningFrisco";

const URL = "https://savvyswim.com/pool-cleaning-frisco";
/** All Frisco URLs serve the same page. One canonical keeps them from competing. */
const CANONICAL = "https://savvyswim.com/pool-cleaning-frisco-tx";
const TITLE = "Pool Cleaning Frisco, TX | Weekly Service";
const DESCRIPTION =
  "Frisco pool cleaning with weekly chemistry, cleaning, equipment checks, and visit photos. Request a free walkthrough from Savvy Swim.";

export const Route = createFileRoute("/pool-cleaning-frisco")({
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