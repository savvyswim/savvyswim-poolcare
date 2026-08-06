import { createFileRoute } from "@tanstack/react-router";
import PricingMatrix from "@/crm/pages/PricingMatrix";

export const Route = createFileRoute("/_crm/admin/crm/pricing-matrix")({
  component: PricingMatrix,
});
