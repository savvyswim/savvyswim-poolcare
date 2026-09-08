import { createFileRoute } from "@tanstack/react-router";
import { CrmMovedRedirect } from "@/components/AppHandoff";
import { portalUrl } from "@/lib/app-links";

export const Route = createFileRoute("/portal")({
  head: () => ({
    meta: [
      { title: "Customer Portal | Savvy Swim" },
      {
        name: "description",
        content:
          "The Savvy Swim customer portal, invoices, visits, water reports and support. Now lives in the Savvy Swim app.",
      },
      { property: "og:title", content: "Customer Portal | Savvy Swim" },
      {
        property: "og:description",
        content: "Invoices, visits, water reports and support for Savvy Swim customers.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => <CrmMovedRedirect to={portalUrl()} />,
});
