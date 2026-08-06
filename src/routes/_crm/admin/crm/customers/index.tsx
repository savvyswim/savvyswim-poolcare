import { createFileRoute } from "@tanstack/react-router";
import CustomersPage from "@/crm/pages/Customers";

export const Route = createFileRoute("/_crm/admin/crm/customers/")({
  component: CustomersPage,
});
