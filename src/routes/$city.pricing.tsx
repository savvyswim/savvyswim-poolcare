import { createFileRoute, notFound } from "@tanstack/react-router";
import CityPricing from "@/components/CityPricing";
import {
  buildPricingFaq,
  getPricingArea,
  PRICING_AREAS,
  priceNumber,
  priceOnly,
} from "@/lib/city-pricing";

export const Route = createFileRoute("/$city/pricing")({
  loader: ({ params }) => {
    const area = getPricingArea(params.city);
    if (!area) throw notFound();
    return { slug: area.slug };
  },
  head: ({ loaderData }) => {
    const area = loaderData ? getPricingArea(loaderData.slug) : undefined;
    if (!area) {
      return { meta: [{ title: "Page not found | Savvy Swim" }, { name: "robots", content: "noindex" }] };
    }
    const price = priceOnly(area.startingPrice);
    const title = `${area.name} Pool Service Pricing from ${price}/mo | Savvy Swim`;
    const description = `Exact weekly pool service pricing for ${area.name}, TX. Plans from ${price} a month with chemicals included, no contract, and a free inspection before you book.`;
    const url = `https://savvyswim.com/${area.slug}/pricing`;
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
            name: `Weekly Pool Service ${area.name} TX`,
            serviceType: "Pool cleaning and maintenance",
            url,
            provider: {
              "@type": "LocalBusiness",
              name: "Savvy Swim",
              telephone: "+1-817-663-7665",
              url: "https://savvyswim.com",
            },
            areaServed: { "@type": "City", name: area.name, addressRegion: "TX" },
            offers: {
              "@type": "Offer",
              price: priceNumber(area.startingPrice),
              priceCurrency: "USD",
              availability: "https://schema.org/InStock",
              url,
            },
          }),
        },
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: buildPricingFaq(area).map((f) => ({
              "@type": "Question",
              name: f.q,
              acceptedAnswer: { "@type": "Answer", text: f.a },
            })),
          }),
        },
      ],
    };
  },
  component: CityPricingPage,
});

function CityPricingPage() {
  const { slug } = Route.useLoaderData();
  const area = getPricingArea(slug) ?? PRICING_AREAS[0]!;
  return <CityPricing area={area} />;
}
