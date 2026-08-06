import { createFileRoute } from "@tanstack/react-router";
import SetPassword from "@/pages/SetPassword";

export const Route = createFileRoute("/set-password")({
  component: SetPassword,
});
