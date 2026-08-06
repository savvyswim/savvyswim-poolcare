import { createFileRoute } from "@tanstack/react-router";
import Index from "@/pages/Index";
import { Navigate } from "@/lib/router-compat";
import { isAppHost } from "@/hooks/useAppHost";

export const Route = createFileRoute("/")({
  component: () => (isAppHost() ? <Navigate to="/portal" replace /> : <Index />),
});
