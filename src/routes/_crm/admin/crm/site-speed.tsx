import { createFileRoute } from "@tanstack/react-router";
import SiteSpeed from "@/crm/pages/SiteSpeed";

export const Route = createFileRoute("/_crm/admin/crm/site-speed")({
  component: SiteSpeed,
});
