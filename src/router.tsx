import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    // Route components are split automatically by TanStack Start. Fetch the
    // matching chunk when a visitor shows intent, rather than on first paint.
    defaultPreload: "intent",
    defaultPreloadDelay: 120,
    defaultPreloadStaleTime: 30_000,
  });

  return router;
};
