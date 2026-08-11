import { createFileRoute } from "@tanstack/react-router";
import Index from "@/pages/Index";
import photoPoolWaterMobile from "@/assets/pool-water-mobile.webp.asset.json";
import { pool_water_hd_jpg as photoPoolWater } from "@/assets/photos";
import { localBusinessSchema, serviceSchema, SITE_URL } from "@/lib/structured-data";

const TITLE = "Pool Service DFW from $129.99/mo | Savvy Swim";
const DESCRIPTION =
  "Weekly pool cleaning, chemistry and repair across Dallas–Fort Worth from $129.99/mo. Same tech every week, photo report every visit, no contracts. Free inspection.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      // LCP hero backdrop — start the mobile-sized fetch during HTML parse.
      {
        rel: "preload",
        as: "image",
        href: photoPoolWaterMobile.url,
        imageSrcSet: `${photoPoolWaterMobile.url} 960w, ${photoPoolWater.url} 1600w`,
        imageSizes: "100vw",
        fetchPriority: "high",
      },
      { rel: "canonical", href: `${SITE_URL}/` },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(localBusinessSchema(photoPoolWater.url)),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify(
          serviceSchema({
            name: "Weekly pool service",
            serviceType: "Pool cleaning service",
            description:
              "Weekly pool cleaning, water testing, chemicals, and equipment checks with a photo report every visit.",
            url: `${SITE_URL}/weekly-pool-service`,
            price: "129.99",
          }),
        ),
      },
    ],
  }),
  component: Index,
});
