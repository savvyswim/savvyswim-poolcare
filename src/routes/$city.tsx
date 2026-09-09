import { createFileRoute, Outlet } from "@tanstack/react-router";

/** Layout only. The city landing page lives in $city.index.tsx. */
export const Route = createFileRoute("/$city")({
  component: () => <Outlet />,
});
