import { createFileRoute } from "@tanstack/react-router";
import AdminTeam from "@/pages/AdminTeam";
import { RequireModule } from "@/crm/components/RequireModule";

export const Route = createFileRoute("/admin/team")({
  component: () => (
    <RequireModule module="team">
      <AdminTeam />
    </RequireModule>
  ),
});
