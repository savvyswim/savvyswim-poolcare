import { createFileRoute } from "@tanstack/react-router";
import Reports from "@/crm/pages/Reports";

export const Route = createFileRoute("/_crm/admin/crm/reports")({
  component: Reports,
});
