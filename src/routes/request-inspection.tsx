import { createFileRoute } from "@tanstack/react-router";
import RequestInspection from "@/pages/RequestInspection";

const URL = "https://savvyswim.com/request-inspection";
const TITLE = "Request a Free Pool Inspection in DFW | Savvy Swim";
const DESCRIPTION =
  "Get a free pool inspection in Dallas–Fort Worth. A Savvy Swim tech tests chemistry, checks equipment and surfaces, then sends a flat-rate quote — no obligation.";

export const Route = createFileRoute("/request-inspection")({
  component: RequestInspection,
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: URL },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: URL }],
  }),
});
