import { createFileRoute } from "@tanstack/react-router";
import Index from "@/pages/Index";
import photoPoolWaterMobile from "@/assets/pool-water-mobile.webp.asset.json";
import { pool_water_hd_jpg as photoPoolWater } from "@/assets/photos";

const TITLE = "Savvy Swim | Weekly Pool Service & Repair in DFW";
const DESCRIPTION =
  "Weekly pool cleaning, water chemistry and equipment repair across Dallas–Fort Worth. Licensed techs, photo-verified visits, and the Savvy Swim Club membership.";

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
    ],
  }),
  component: Index,
});
