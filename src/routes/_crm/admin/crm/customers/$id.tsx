import { createFileRoute } from "@tanstack/react-router";
import CustomerDetail from "@/crm/pages/CustomerDetail";

export const Route = createFileRoute("/_crm/admin/crm/customers/$id")({
  component: CustomerDetail,
});
