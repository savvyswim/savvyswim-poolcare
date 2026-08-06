import { createFileRoute } from "@tanstack/react-router";
import AdminCRM from "@/pages/AdminCRM";

export const Route = createFileRoute("/admin/crm/legacy")({
  component: AdminCRM,
});
