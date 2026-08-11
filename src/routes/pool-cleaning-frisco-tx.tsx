import { createFileRoute } from "@tanstack/react-router";
import PoolCleaningFrisco from "@/pages/PoolCleaningFrisco";

const URL = "https://savvyswim.com/pool-cleaning-frisco-tx";
const TITLE = "Pool Cleaning in Frisco, TX from $129.99/mo | Savvy Swim";
const DESCRIPTION =
  "Weekly pool cleaning in Frisco, TX from $129.99/mo. Chemistry, cleaning and equipment checks with a photo report every visit — Starwood, Stonebriar and citywide.";

export const Route = createFileRoute("/pool-cleaning-frisco-tx")({
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
    links: [{ rel: "canonical", href: URL }],
  }),
  component: PoolCleaningFrisco,
});
