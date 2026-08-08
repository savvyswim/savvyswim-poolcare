import { createFileRoute } from "@tanstack/react-router";
import JobCosting from "@/crm/pages/JobCosting";

export const Route = createFileRoute("/_crm/admin/crm/job-costing")({
  component: JobCosting,
});
