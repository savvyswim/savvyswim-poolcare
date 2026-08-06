import { createFileRoute } from "@tanstack/react-router";
import AdminCleaning from "@/pages/AdminCleaning";
import { RequireModule } from "@/crm/components/RequireModule";

export const Route = createFileRoute("/admin/cleaning")({
  component: () => (
    <RequireModule module="cleaning">
      <AdminCleaning />
    </RequireModule>
  ),
});
