import { createFileRoute } from "@tanstack/react-router";
import Finance from "@/crm/pages/Finance";

export const Route = createFileRoute("/_crm/admin/crm/finance")({
  component: Finance,
});
