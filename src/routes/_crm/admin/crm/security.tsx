import { createFileRoute } from "@tanstack/react-router";
import SecurityPage from "@/crm/pages/Security";

export const Route = createFileRoute("/_crm/admin/crm/security")({
  component: SecurityPage,
});
