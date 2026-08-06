import { createFileRoute } from "@tanstack/react-router";
import Jobs from "@/crm/pages/Jobs";

export const Route = createFileRoute("/_crm/admin/crm/jobs")({
  component: Jobs,
});
