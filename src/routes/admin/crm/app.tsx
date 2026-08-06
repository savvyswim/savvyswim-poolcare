import { createFileRoute } from "@tanstack/react-router";
import CrmApp from "@/pages/CrmApp";
import { RequireModule } from "@/crm/components/RequireModule";

export const Route = createFileRoute("/admin/crm/app")({
  component: () => (
    <RequireModule module="console">
      <CrmApp />
    </RequireModule>
  ),
});
