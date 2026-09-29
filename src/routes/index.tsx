import { createFileRoute } from "@tanstack/react-router";
import Index from "@/pages/Index";
import {
  pool_water_hd_jpg as photoPoolWater,
  IMG_5512_PNG as photoLifeguardChair,
} from "@/assets/photos";

import { localBusinessSchema, serviceSchema, SITE_URL } from "@/lib/structured-data";
import { listApprovedReviews } from "@/lib/reviews.functions";

// SEO title keeps the starting price for search rankings.
const TITLE = "Pool Service DFW from $129.99/mo | Savvy Swim";
const DESCRIPTION =
  "Weekly pool cleaning, chemistry and repair across DFW from $129.99/mo. Same tech every week, photo report every visit, no contracts. Book a free inspection.";
// Share-card text (link previews) stays price-free.
const SHARE_TITLE = "Savvy Swim | Pool Service in Dallas Fort Worth";
const SHARE_DESCRIPTION =
  "Weekly pool cleaning, chemistry and repair across DFW. Same tech every week, photo report every visit, no contracts. Book a free inspection.";
const SHARE_IMAGE = `${SITE_URL}/og-savvy-swim-home-v2.jpg`;

export const Route = createFileRoute("/")({
  loader: async () => ({ reviews: await listApprovedReviews() }),
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: SHARE_TITLE },
      { property: "og:description", content: SHARE_DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: `${SITE_URL}/` },
      { property: "og:image", content: SHARE_IMAGE },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: "Savvy Swim weekly pool service" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: SHARE_TITLE },
      { name: "twitter:description", content: SHARE_DESCRIPTION },
      { name: "twitter:image", content: SHARE_IMAGE },
      { name: "twitter:image:alt", content: "Savvy Swim weekly pool service" },
    ],
    links: [
      // LCP hero photo, start the fetch during HTML parse. Only the modern
      // format is preloaded, so no browser downloads the same photo twice.
      {
        rel: "preload",
        as: "image",
        type: "image/avif",
        href: photoLifeguardChair.url,
        imageSrcSet: photoLifeguardChair.avifSrcSet,
        imageSizes: "(min-width: 1024px) 11rem, 128px",
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
