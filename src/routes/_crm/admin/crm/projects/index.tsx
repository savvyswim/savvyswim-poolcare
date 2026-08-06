import { createFileRoute } from "@tanstack/react-router";
import Projects from "@/crm/pages/Projects";

export const Route = createFileRoute("/_crm/admin/crm/projects/")({
  component: Projects,
});
