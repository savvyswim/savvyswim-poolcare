import { createFileRoute } from "@tanstack/react-router";
import RequestInspection from "@/pages/RequestInspection";

export const Route = createFileRoute("/free-inspection")({
  component: RequestInspection,
});
