import { createFileRoute } from "@tanstack/react-router";
import Trucks from "@/crm/pages/Trucks";

export const Route = createFileRoute("/_crm/admin/crm/trucks")({
  component: Trucks,
});
