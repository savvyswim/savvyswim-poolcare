import { createFileRoute } from "@tanstack/react-router";
import DeployHealth from "@/crm/pages/DeployHealth";

export const Route = createFileRoute("/_crm/admin/crm/deploy-health")({
  component: DeployHealth,
});
