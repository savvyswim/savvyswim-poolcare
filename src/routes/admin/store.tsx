import { createFileRoute } from "@tanstack/react-router";
import AdminStore from "@/pages/AdminStore";
import { RequireModule } from "@/crm/components/RequireModule";

export const Route = createFileRoute("/admin/store")({
  component: () => (
    <RequireModule module="store">
      <AdminStore />
    </RequireModule>
  ),
});
