import { createFileRoute } from "@tanstack/react-router";
import Portal from "@/pages/Portal";

export const Route = createFileRoute("/portal")({
  component: Portal,
});
