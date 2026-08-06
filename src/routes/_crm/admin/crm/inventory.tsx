import { createFileRoute } from "@tanstack/react-router";
import Inventory from "@/crm/pages/Inventory";

export const Route = createFileRoute("/_crm/admin/crm/inventory")({
  component: Inventory,
});
