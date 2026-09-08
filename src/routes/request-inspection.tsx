/**
 * /request-inspection, legacy lead form URL. Lead capture now lives on the
 * home page, so this permanently redirects there with the form auto-opened.
 */
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/request-inspection")({
  beforeLoad: () => {
    throw redirect({ to: "/", search: { quote: "1", source: "legacy_request_inspection" }, statusCode: 301 });
  },
});
