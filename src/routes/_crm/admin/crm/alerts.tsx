import { createFileRoute } from "@tanstack/react-router";
import Alerts from "@/crm/pages/Alerts";

export const Route = createFileRoute("/_crm/admin/crm/alerts")({
  component: Alerts,
});
