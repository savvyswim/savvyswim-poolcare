import { createFileRoute, redirect } from "@tanstack/react-router";
import Index from "@/pages/Index";
import { Navigate } from "@/lib/router-compat";
import { isAppHost } from "@/hooks/useAppHost";
import photoPoolWaterMobile from "@/assets/pool-water-mobile.webp.asset.json";

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
        fetchpriority: "high",
      },
    ],
  }),
  // On savvyswim.app the marketing page is never wanted. Redirecting in
  // beforeLoad skips rendering the landing page entirely, so the app door
  // (and from there the CRM) opens without the flash of the website.
  beforeLoad: () => {
    if (typeof window !== "undefined" && isAppHost()) {
      throw redirect({ to: "/app", replace: true });
    }
  },
  component: () => (isAppHost() ? <Navigate to="/app" replace /> : <Index />),
});
