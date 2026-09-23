import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/b")({
  beforeLoad: () => {
    throw redirect({ to: "/book", search: {}, statusCode: 301 });
  },
});
