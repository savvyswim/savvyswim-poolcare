import { createFileRoute } from "@tanstack/react-router";
import MarginCalculatorPage from "@/crm/pages/MarginCalculatorPage";

export const Route = createFileRoute("/_crm/admin/crm/margin")({
  component: MarginCalculatorPage,
});
