import { createFileRoute } from "@tanstack/react-router";
import QcReview from "@/crm/pages/QcReview";

export const Route = createFileRoute("/_crm/admin/crm/qc-review")({
  component: QcReview,
});
