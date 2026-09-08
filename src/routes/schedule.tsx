import { createFileRoute } from "@tanstack/react-router";
import Schedule from "@/pages/Schedule";
import { SITE_URL } from "@/lib/structured-data";

const TITLE = "Schedule a Free Pool Inspection in DFW | Savvy Swim";
const DESC =
  "Book a free pool inspection in Dallas–Fort Worth. Full water test, equipment check and a flat monthly price, pick your day in under a minute.";
const URL = `${SITE_URL}/schedule`;

/** Keeps campaign params on the URL so first-touch attribution can read them. */
const str = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : undefined);

export const Route = createFileRoute("/schedule")({
  validateSearch: (search: Record<string, unknown>) => ({
    src: str(search["src"], 40),
    campaign_id: str(search["campaign_id"], 60),
    utm_source: str(search["utm_source"], 120),
    utm_medium: str(search["utm_medium"], 120),
    utm_campaign: str(search["utm_campaign"], 120),
    utm_term: str(search["utm_term"], 120),
    utm_content: str(search["utm_content"], 120),
    gclid: str(search["gclid"], 200),
    fbclid: str(search["fbclid"], 200),
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
  const { src, utm_campaign, utm_source } = Route.useSearch();
  // Campaign code from the QR/flyer, else the paid-campaign name, else direct.
  const code = (src || utm_campaign || utm_source || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 30);
  return <Schedule source={code ? `schedule_${code}` : "schedule_page"} />;
}

