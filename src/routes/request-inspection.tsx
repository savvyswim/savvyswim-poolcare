import { createFileRoute } from "@tanstack/react-router";
import RequestInspection from "@/pages/RequestInspection";

const URL = "https://savvyswim.com/request-inspection";
const TITLE = "Free Pool Inspection Request | Savvy Swim DFW";
const DESCRIPTION =
  "Request a free pool inspection in Dallas–Fort Worth. A Savvy Swim tech checks water chemistry, equipment and surfaces, then sends a clear service quote.";

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
