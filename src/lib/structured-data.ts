import { SERVICE_AREAS } from "@/lib/serviceAreas";

export const SITE_URL = "https://savvyswim.com";
export const BUSINESS_ID = `${SITE_URL}/#localbusiness`;

const PHONE = "+1-469-744-0379";
const EMAIL = "hi@savvyswim.com";
const LOGO = `${SITE_URL}/apple-touch-icon.png`;

/** Cities we run weekly routes in, as schema.org City nodes. */
export const areaServed = [
  ...SERVICE_AREAS.map((a) => ({
    "@type": "City",
    name: a.name,
    address: { "@type": "PostalAddress", addressRegion: "TX", addressCountry: "US" },
  })),
  { "@type": "AdministrativeArea", name: "Dallas–Fort Worth metroplex" },
];

/** Full LocalBusiness node. Emit once, on the homepage. */
export function localBusinessSchema(image?: string) {
  return {
    "@context": "https://schema.org",
    "@type": ["LocalBusiness", "HomeAndConstructionBusiness"],
    "@id": BUSINESS_ID,
    name: "Savvy Swim",
    alternateName: "Savvy Swim Pool Service",
    url: `${SITE_URL}/`,
    logo: LOGO,
    ...(image ? { image } : {}),
    description:
      "Weekly pool cleaning, water chemistry, and equipment repair across the Dallas–Fort Worth metroplex. Licensed techs and a photo report every visit.",
    telephone: PHONE,
    email: EMAIL,
    priceRange: "$$",
    currenciesAccepted: "USD",
    paymentAccepted: "Credit Card, ACH",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Plano",
      addressRegion: "TX",
      addressCountry: "US",
    },
    areaServed,
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        opens: "08:00",
        closes: "18:00",
      },
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: "Saturday",
        opens: "09:00",
        closes: "14:00",
      },
    ],
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Pool services",
      itemListElement: SERVICE_CATALOG.map((s) => ({
        "@type": "Offer",
        itemOffered: { "@type": "Service", name: s.name, description: s.description },
        ...(s.price ? { price: s.price, priceCurrency: "USD" } : {}),
      })),
    },
  };
}

export const SERVICE_CATALOG: {
  name: string;
  description: string;
  price?: string;
  url?: string;
}[] = [
  {
    name: "Weekly pool service",
    description:
      "Full water test, chemicals, skim, brush, vacuum, basket and filter check, with a photo report every visit.",
    price: "129.99",
    url: `${SITE_URL}/weekly-pool-service`,
  },
  {
    name: "Green pool recovery",
    description:
      "Chemical reset, deep vacuum, and filter clean to bring a neglected or storm-hit pool back to swim-ready.",
  },
  {
    name: "Pool equipment repair",
    description:
      "Pumps, filters, heaters, salt cells, and automation — common parts stocked on the truck for one-trip repairs.",
  },
  {
    name: "Filter cleans and hard-water scale care",
    description:
      "Cartridge and DE filter cleans plus calcium and waterline scale treatment for North Texas hard water.",
  },
];

/** Service node that points back at the shared LocalBusiness @id. */
export function serviceSchema(opts: {
  name: string;
  description: string;
  url: string;
  price?: string;
  serviceType?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: opts.name,
    serviceType: opts.serviceType ?? opts.name,
    description: opts.description,
    url: opts.url,
    provider: { "@id": BUSINESS_ID },
    areaServed,
    ...(opts.price
      ? {
          offers: {
            "@type": "Offer",
            price: opts.price,
            priceCurrency: "USD",
            url: opts.url,
          },
        }
      : {}),
  };
}
