import { createFileRoute } from "@tanstack/react-router";
import ProjectDetail from "@/crm/pages/ProjectDetail";

export const Route = createFileRoute("/_crm/admin/crm/projects/$id")({
  component: ProjectDetail,
});
