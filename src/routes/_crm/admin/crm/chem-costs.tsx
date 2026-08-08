import { createFileRoute } from "@tanstack/react-router";
import ChemCosts from "@/crm/pages/ChemCosts";

export const Route = createFileRoute("/_crm/admin/crm/chem-costs")({
  component: ChemCosts,
});
