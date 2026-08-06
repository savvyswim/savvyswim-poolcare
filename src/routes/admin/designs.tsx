import { createFileRoute } from "@tanstack/react-router";
import AdminDesigns from "@/pages/AdminDesigns";
import { RequireModule } from "@/crm/components/RequireModule";

export const Route = createFileRoute("/admin/designs")({
  component: () => (
    <RequireModule module="designs">
      <AdminDesigns />
    </RequireModule>
  ),
});
