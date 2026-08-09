import { createFileRoute } from "@tanstack/react-router";
import Auth from "@/pages/Auth";
import { CRM_IS_EXTERNAL, staffLoginUrl } from "@/lib/app-links";
import { CrmMovedRedirect } from "@/components/AppHandoff";

export const Route = createFileRoute("/admin/crm/login")({
  head: () => ({
    meta: [
      { title: "Staff Login — Savvy Swim OS" },
      { name: "description", content: "Sign in to the Savvy Swim staff console." },
      { property: "og:title", content: "Staff Login — Savvy Swim OS" },
      { property: "og:description", content: "Sign in to the Savvy Swim staff console." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () =>
    CRM_IS_EXTERNAL ? <CrmMovedRedirect to={staffLoginUrl()} /> : <Auth />,
});
