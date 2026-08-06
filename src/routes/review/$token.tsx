import { createFileRoute } from "@tanstack/react-router";
import ReviewLink from "@/pages/ReviewLink";

export const Route = createFileRoute("/review/$token")({
  component: ReviewLink,
});
