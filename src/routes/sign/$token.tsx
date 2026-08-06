import { createFileRoute } from "@tanstack/react-router";
import SignContract from "@/pages/SignContract";

export const Route = createFileRoute("/sign/$token")({
  head: () => ({
    meta: [
      { title: "Sign your service agreement — Savvy Swim" },
      { name: "description", content: "Review and electronically sign your Savvy Swim pool service agreement in under a minute." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Sign your service agreement — Savvy Swim" },
      { property: "og:description", content: "Review and electronically sign your Savvy Swim pool service agreement." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SignContract,
});
