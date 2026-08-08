import { createFileRoute } from "@tanstack/react-router";
import AuditTrail from "@/crm/pages/AuditTrail";

export const Route = createFileRoute("/_crm/admin/crm/audit-trail")({
  component: AuditTrail,
});
