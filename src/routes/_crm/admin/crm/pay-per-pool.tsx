import { createFileRoute } from "@tanstack/react-router";
import PayPerPool from "@/crm/pages/PayPerPool";

export const Route = createFileRoute("/_crm/admin/crm/pay-per-pool")({
  component: PayPerPool,
});
