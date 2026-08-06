import { createFileRoute } from "@tanstack/react-router";
import AppHome from "@/pages/AppHome";

export const Route = createFileRoute("/app")({
  head: () => ({
    meta: [
      { title: "Savvy Swim App — Customer, Tech & Office Access" },
      {
        name: "description",
        content:
          "Sign in to the Savvy Swim app: pool customers see visits and water reports, techs run their route, the office runs the CRM.",
      },
      { property: "og:type", content: "website" },
      { property: "og:title", content: "Savvy Swim App — Customer, Tech & Office Access" },
      {
        property: "og:description",
        content: "One app for pool customers, technicians and the Savvy Swim office.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AppHome,
});
