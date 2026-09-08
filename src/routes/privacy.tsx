import { createFileRoute } from "@tanstack/react-router";
import Privacy from "@/pages/Privacy";

const CANONICAL = "https://savvyswimservices.com/privacy";
const TITLE = "Privacy Policy | Savvy Swim Pool Service";
const DESCRIPTION =
  "How Savvy Swim collects, uses and protects the information you share when you request a pool inspection, join Swim Club or use our customer portal.";

export const Route = createFileRoute("/privacy")({
  component: Privacy,
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: "Privacy Policy | Savvy Swim" },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: CANONICAL },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Privacy Policy | Savvy Swim" },
      { name: "twitter:description", content: DESCRIPTION },
    ],
    links: [{ rel: "canonical", href: CANONICAL }],
  }),
});
