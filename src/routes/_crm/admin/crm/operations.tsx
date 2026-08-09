import { createFileRoute } from "@tanstack/react-router";
import WorkspaceHome from "@/crm/pages/WorkspaceHome";

export const Route = createFileRoute("/_crm/admin/crm/operations")({
  component: () => <WorkspaceHome workspace="operations" />,
});
