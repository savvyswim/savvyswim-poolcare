import { createFileRoute } from "@tanstack/react-router";
import RevenueGrowth from "@/crm/pages/RevenueGrowth";

export const Route = createFileRoute("/_crm/admin/crm/revenue-growth")({
  component: RevenueGrowth,
});
