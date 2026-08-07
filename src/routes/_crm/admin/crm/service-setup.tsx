import { createFileRoute } from "@tanstack/react-router";
import ServiceSetup from "@/crm/pages/ServiceSetup";

export const Route = createFileRoute("/_crm/admin/crm/service-setup")({
  component: ServiceSetup,
});
