import { createFileRoute } from "@tanstack/react-router";
import ReviewsPage from "@/crm/pages/Reviews";

export const Route = createFileRoute("/_crm/admin/crm/reviews")({
  component: ReviewsPage,
});
