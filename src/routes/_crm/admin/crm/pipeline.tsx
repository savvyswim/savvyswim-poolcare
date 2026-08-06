import { createFileRoute } from "@tanstack/react-router";
import Pipeline from "@/crm/pages/Pipeline";

export const Route = createFileRoute("/_crm/admin/crm/pipeline")({
  component: Pipeline,
});
