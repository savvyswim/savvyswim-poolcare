import { createFileRoute } from "@tanstack/react-router";
import PoolCleaningPlano from "@/pages/PoolCleaningPlano";

const URL = "https://savvyswimservices.com/pool-cleaning-plano";
const TITLE = "Pool Cleaning Plano, TX | Weekly Service";
const DESCRIPTION =
  "Plano pool cleaning with weekly chemistry, cleaning, equipment checks, and visit photos. Request a free walkthrough from Savvy Swim.";

export const Route = createFileRoute("/pool-cleaning-plano")({
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
  component: PoolCleaningPlano,
});
