import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    // Route components are split automatically by TanStack Start. Phones have
    // no hover, so fetch the chunk for any link that scrolls into view. Page
    // changes then feel instant on a phone.
    defaultPreload: "viewport",
    defaultPreloadDelay: 60,
    defaultPreloadStaleTime: 30_000,

  });

  return router;
};
