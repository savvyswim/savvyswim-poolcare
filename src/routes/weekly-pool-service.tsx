import { createFileRoute } from "@tanstack/react-router";
import WeeklyPoolService, { WEEKLY_FAQ } from "@/pages/WeeklyPoolService";
import { serviceSchema } from "@/lib/structured-data";

const TITLE = "Weekly Pool Service Near Me | DFW Pool Cleaning — Savvy Swim";
const DESC =
  "What weekly pool service includes: full water test, chemicals, cleaning, filter check and a photo report every visit. Same tech, fixed route day. From $129.99/mo in DFW.";
const URL = "https://savvyswim.com/weekly-pool-service";

export const Route = createFileRoute("/weekly-pool-service")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { property: "og:url", content: URL },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(
          serviceSchema({
            name: "Weekly pool service",
            serviceType: "Weekly pool cleaning and maintenance",
            description:
              "Full water test, chemicals, skim, brush, vacuum, basket and filter check, with a photo report every visit.",
            url: URL,
            price: "129.99",
          }),
        ),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: WEEKLY_FAQ.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }),
      },
    ],
  }),
  component: WeeklyPoolService,
});
