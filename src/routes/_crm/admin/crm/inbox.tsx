import { createFileRoute } from "@tanstack/react-router";
import Inbox from "@/crm/pages/Inbox";

export const Route = createFileRoute("/_crm/admin/crm/inbox")({
  component: Inbox,
});
