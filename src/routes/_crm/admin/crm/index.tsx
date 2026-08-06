import { createFileRoute } from "@tanstack/react-router";
import RoutePage from "@/crm/pages/Route";

export const Route = createFileRoute("/_crm/admin/crm/")({
  component: RoutePage,
});
