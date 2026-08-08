import { createFileRoute } from "@tanstack/react-router";
import Quotes from "@/crm/pages/Quotes";

export const Route = createFileRoute("/_crm/admin/crm/quotes")({
  component: Quotes,
});
