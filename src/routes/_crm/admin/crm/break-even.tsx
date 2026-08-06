import { createFileRoute } from "@tanstack/react-router";
import BreakEven from "@/crm/pages/BreakEven";

export const Route = createFileRoute("/_crm/admin/crm/break-even")({
  component: BreakEven,
});
