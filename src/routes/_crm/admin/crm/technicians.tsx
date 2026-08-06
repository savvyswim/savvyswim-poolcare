import { createFileRoute } from "@tanstack/react-router";
import Technicians from "@/crm/pages/Technicians";

export const Route = createFileRoute("/_crm/admin/crm/technicians")({
  component: Technicians,
});
