import { createFileRoute } from "@tanstack/react-router";
import Products from "@/crm/pages/Products";

export const Route = createFileRoute("/_crm/admin/crm/products")({
  component: Products,
});
