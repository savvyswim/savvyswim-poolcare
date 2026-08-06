import { createFileRoute } from "@tanstack/react-router";
import AdminActivity from "@/pages/AdminActivity";
import { RequireModule } from "@/crm/components/RequireModule";

export const Route = createFileRoute("/admin/activity")({
  component: () => (
    <RequireModule module="activity">
      <AdminActivity />
    </RequireModule>
  ),
});
