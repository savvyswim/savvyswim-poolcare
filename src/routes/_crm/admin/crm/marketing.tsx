import { createFileRoute } from "@tanstack/react-router";
import WorkspaceHome from "@/crm/pages/WorkspaceHome";

export const Route = createFileRoute("/_crm/admin/crm/marketing")({
  component: () => <WorkspaceHome workspace="marketing" />,
});
