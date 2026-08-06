import { createFileRoute } from "@tanstack/react-router";

import { getStartupHealth } from "@/lib/startup-health";

export const Route = createFileRoute("/api/public/health")({
  server: {
    handlers: {
      GET: async () => {
        const health = getStartupHealth();
        return Response.json(health, {
          status: health.status === "failed" ? 503 : 200,
          headers: { "cache-control": "no-store" },
        });
      },
    },
  },
});
