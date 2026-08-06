import { createFileRoute } from "@tanstack/react-router";
import ServicePlans from "@/crm/pages/ServicePlans";

export const Route = createFileRoute("/_crm/admin/crm/service-plans")({
  component: ServicePlans,
});
