import { createFileRoute } from "@tanstack/react-router";
import WebhookTester from "@/crm/pages/WebhookTester";

export const Route = createFileRoute("/_crm/admin/crm/webhook-tester")({
  component: WebhookTester,
});
