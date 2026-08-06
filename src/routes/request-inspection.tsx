import { createFileRoute } from "@tanstack/react-router";
import RequestInspection from "@/pages/RequestInspection";

export const Route = createFileRoute("/request-inspection")({
  component: RequestInspection,
});
