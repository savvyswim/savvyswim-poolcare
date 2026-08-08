import { createFileRoute } from "@tanstack/react-router";
import Automations from "@/crm/pages/Automations";

export const Route = createFileRoute("/_crm/admin/crm/automations")({
  component: Automations,
});
