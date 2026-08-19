import { createFileRoute } from "@tanstack/react-router";
import Schedule from "@/pages/Schedule";
import { SITE_URL } from "@/lib/structured-data";

const TITLE = "Schedule a Free Pool Inspection in DFW | Savvy Swim";
const DESC =
  "Book a free pool inspection in Dallas–Fort Worth. Full water test, equipment check and a flat monthly price — pick your day in under a minute.";
const URL = `${SITE_URL}/schedule`;

export const Route = createFileRoute("/schedule")({
  validateSearch: (search: Record<string, unknown>) => ({
    src: typeof search['src'] === "string" ? search['src'].slice(0, 40) : undefined,
  }),
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { property: "og:url", content: URL },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESC },
    ],
    links: [{ rel: "canonical", href: URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Service",
          name: "Free pool inspection",
          serviceType: "Pool inspection and water test",
          url: URL,
          areaServed: { "@type": "AdministrativeArea", name: "Dallas–Fort Worth, TX" },
          provider: {
            "@type": "LocalBusiness",
            name: "Savvy Swim",
            telephone: "+1-817-663-7665",
            url: SITE_URL,
          },
          offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        }),
      },
    ],
  }),
  component: SchedulePage,
});

function SchedulePage() {
  const { src } = Route.useSearch();
  return <Schedule source={src ? `schedule_${src}` : "schedule_page"} />;
}
