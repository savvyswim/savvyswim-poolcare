import { createFileRoute } from "@tanstack/react-router";
import WebsiteConnect from "@/crm/pages/WebsiteConnect";

export const Route = createFileRoute("/_crm/admin/crm/connect")({
  component: WebsiteConnect,
});
