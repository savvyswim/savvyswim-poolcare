import { createFileRoute } from "@tanstack/react-router";
import CrmSettings from "@/crm/pages/Settings";

export const Route = createFileRoute("/_crm/admin/crm/settings")({
  component: CrmSettings,
});
