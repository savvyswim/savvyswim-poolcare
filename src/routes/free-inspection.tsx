import { createFileRoute } from "@tanstack/react-router";
import RequestInspection from "@/pages/RequestInspection";

const CANONICAL = "https://savvyswim.com/request-inspection";
const TITLE = "Free Pool Inspection in Dallas–Fort Worth | Savvy Swim";
const DESCRIPTION =
  "Book a free pool inspection with Savvy Swim: chemistry test, equipment and surface check across Dallas–Fort Worth, plus a flat-rate quote the same week.";

export const Route = createFileRoute("/free-inspection")({
  component: RequestInspection,
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: CANONICAL },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: CANONICAL }],
  }),
});
