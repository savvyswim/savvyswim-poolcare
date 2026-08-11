import { createFileRoute, notFound } from "@tanstack/react-router";
import CityLanding from "@/pages/CityLanding";
import { buildCityFaq, getServiceArea, SERVICE_AREAS } from "@/lib/serviceAreas";


export const Route = createFileRoute("/$city")({
  loader: ({ params }) => {
    const area = getServiceArea(params.city);
    if (!area) throw notFound();
    return { slug: area.slug };
  },
  head: ({ loaderData }) => {
    const area = loaderData ? getServiceArea(loaderData.slug) : undefined;
    if (!area) {
      return { meta: [{ title: "Page not found | Savvy Swim" }, { name: "robots", content: "noindex" }] };
    }
    const title = `Pool Cleaning ${area.name} TX — Weekly Service & Repair | Savvy Swim`;
    const description = `Pool cleaning in ${area.name}, TX from ${area.startingPrice}. Weekly chemistry, cleaning, and equipment checks with a photo report every visit. Same tech, same day, no contracts.`;
    const url = `https://savvyswim.com/${area.slug}`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { property: "og:url", content: url },
        { property: "og:site_name", content: "Savvy Swim" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Service",
            name: `Pool Cleaning ${area.name} TX`,
            serviceType: "Pool cleaning and maintenance",
            url,
            provider: {
              "@type": "LocalBusiness",
              name: "Savvy Swim",
              telephone: "+1-469-744-0379",
              url: "https://savvyswim.com",
            },
            areaServed: { "@type": "City", name: area.name, addressRegion: "TX" },
          }),
        },
      ],
    };
  },
  component: CityPage,
});

function CityPage() {
  const { slug } = Route.useLoaderData();
  const area = getServiceArea(slug) ?? SERVICE_AREAS[0]!;
  return <CityLanding area={area} />;
}
