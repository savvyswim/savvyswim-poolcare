import { createFileRoute } from "@tanstack/react-router";
import WaterLab from "@/crm/pages/WaterLab";

export const Route = createFileRoute("/_crm/admin/crm/water-lab")({
  component: WaterLab,
});
