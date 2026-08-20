import { createFileRoute } from "@tanstack/react-router";
import { MovedToApp } from "@/components/MovedToApp";

export const Route = createFileRoute("/app")({
  component: LegacyAppPage,
  head: () => ({
    meta: [
      { title: "Savvy Swim CRM has moved · Savvy Swim" },
      {
        name: "description",
        content:
          "The Savvy Swim staff CRM moved to its own app. Sign in there, or schedule a pool inspection here.",
      },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Savvy Swim CRM has moved" },
      {
        property: "og:description",
        content: "Staff sign-in and the customer portal now live in the Savvy Swim app.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function LegacyAppPage() {
  return <MovedToApp from="/app" />;
}
