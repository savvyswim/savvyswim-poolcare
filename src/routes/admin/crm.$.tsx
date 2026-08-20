import { createFileRoute } from "@tanstack/react-router";
import { MovedToApp } from "@/components/MovedToApp";

export const Route = createFileRoute("/admin/crm/$")({
  component: LegacyAdminCrmSplatPage,
  head: () => ({
    meta: [
      { title: "Admin CRM has moved · Savvy Swim" },
      {
        name: "description",
        content:
          "The Savvy Swim admin CRM moved to its own app. Staff sign in there; homeowners can schedule an inspection here.",
      },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Admin CRM has moved" },
      {
        property: "og:description",
        content: "Staff sign-in and the customer portal now live in the Savvy Swim app.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function LegacyAdminCrmSplatPage() {
  const { _splat } = Route.useParams();
  return <MovedToApp from={`/admin/crm/${_splat ?? ""}`} />;
}
