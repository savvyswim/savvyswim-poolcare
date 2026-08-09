import { createFileRoute } from "@tanstack/react-router";
import Inspections from "@/crm/pages/Inspections";

export const Route = createFileRoute("/_crm/admin/crm/inspections")({
  component: Inspections,
});
