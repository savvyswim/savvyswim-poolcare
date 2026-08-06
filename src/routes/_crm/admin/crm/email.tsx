import { createFileRoute } from "@tanstack/react-router";
import EmailCenter from "@/crm/pages/EmailCenter";

export const Route = createFileRoute("/_crm/admin/crm/email")({
  component: EmailCenter,
});
