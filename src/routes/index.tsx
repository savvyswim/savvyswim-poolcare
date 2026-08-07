import { createFileRoute, redirect } from "@tanstack/react-router";
import Index from "@/pages/Index";
import { Navigate } from "@/lib/router-compat";
import { isAppHost } from "@/hooks/useAppHost";

export const Route = createFileRoute("/")({
  // On savvyswim.app the marketing page is never wanted. Redirecting in
  // beforeLoad skips rendering the landing page entirely, so the app door
  // (and from there the CRM) opens without the flash of the website.
  beforeLoad: () => {
    if (typeof window !== "undefined" && isAppHost()) {
      throw redirect({ to: "/app", replace: true });
    }
  },
  component: () => (isAppHost() ? <Navigate to="/app" replace /> : <Index />),
});
