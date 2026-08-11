import { createFileRoute } from "@tanstack/react-router";
import Services from "@/pages/Services";
import { SERVICE_CATALOG, serviceSchema, SITE_URL } from "@/lib/structured-data";

const TITLE = "Pool Service & Repair in DFW | Savvy Swim";
const DESCRIPTION =
  "Pool service and repair across Dallas–Fort Worth: weekly cleaning, green pool recovery, filter cleans, and pump, heater and salt-cell repair by licensed techs.";
const URL = `${SITE_URL}/services`;

export const Route = createFileRoute("/services")({
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
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: "Savvy Swim pool services",
          itemListElement: SERVICE_CATALOG.map((s, i) => ({
            "@type": "ListItem",
            position: i + 1,
            item: serviceSchema({
              name: s.name,
              description: s.description,
              url: s.url ?? URL,
              ...(s.price ? { price: s.price } : {}),
            }),
          })),
        }),
      },
    ],
  }),
  component: Services,
});
