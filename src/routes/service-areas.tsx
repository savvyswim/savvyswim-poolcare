import { createFileRoute } from "@tanstack/react-router";
import ServiceAreas from "@/pages/ServiceAreas";
import { localBusinessSchema, SITE_URL } from "@/lib/structured-data";

const TITLE = "Pool Service Areas & Hours in DFW | Savvy Swim";
const DESCRIPTION =
  "Savvy Swim services pools across Dallas-Fort Worth. See our weekly service areas, hours, services and contact details, and book a free pool inspection.";
const URL = `${SITE_URL}/service-areas`;

export const Route = createFileRoute("/service-areas")({
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
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(localBusinessSchema()),
      },
    ],
  }),
  component: ServiceAreas,
});
