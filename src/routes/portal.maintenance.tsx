import { createFileRoute } from "@tanstack/react-router";
import PortalMaintenance from "@/pages/PortalMaintenance";

export const Route = createFileRoute("/portal/maintenance")({
  head: () => ({
    meta: [
      { title: "Maintenance Schedule — Savvy Swim" },
      { name: "description", content: "See your upcoming pool maintenance and past clean dates." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Maintenance Schedule — Savvy Swim" },
      { property: "og:description", content: "Upcoming maintenance and past clean dates for your pool." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PortalMaintenance,
});
