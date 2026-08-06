import { createFileRoute } from "@tanstack/react-router";
import TechScorecard from "@/crm/pages/TechScorecard";

export const Route = createFileRoute("/_crm/admin/crm/scorecard")({
  component: TechScorecard,
});
