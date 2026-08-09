import { createFileRoute } from "@tanstack/react-router";
import Portal from "@/pages/Portal";
import { CRM_IS_EXTERNAL, portalUrl } from "@/lib/app-links";
import { CrmMovedRedirect } from "@/components/AppHandoff";

export const Route = createFileRoute("/portal")({
  head: () => ({
    meta: [
      { title: "Customer Portal — Savvy Swim" },
      {
        name: "description",
        content:
          "Sign in to your Savvy Swim customer portal for invoices, visit history, water reports and support.",
      },
      { property: "og:title", content: "Customer Portal — Savvy Swim" },
      {
        property: "og:description",
        content: "Invoices, visits, water reports and support for Savvy Swim customers.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (CRM_IS_EXTERNAL ? <CrmMovedRedirect to={portalUrl()} /> : <Portal />),
});
