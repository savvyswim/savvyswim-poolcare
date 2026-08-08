import { createFileRoute } from "@tanstack/react-router";
import Tickets from "@/crm/pages/Tickets";

export const Route = createFileRoute("/_crm/admin/crm/tickets")({
  component: Tickets,
});
