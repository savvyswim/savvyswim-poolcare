import { createFileRoute } from "@tanstack/react-router";
import CrmLayout from "@/crm/CrmLayout";

export const Route = createFileRoute("/_crm")({
  component: CrmLayout,
});
