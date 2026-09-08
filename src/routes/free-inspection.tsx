/**
 * /free-inspection, legacy lead form URL. Lead capture now lives on the home
 * page, so this permanently redirects there with the quote form auto-opened.
 */
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/free-inspection")({
  beforeLoad: () => {
    throw redirect({ to: "/", search: { quote: "1", source: "legacy_free_inspection" }, statusCode: 301 });
  },
});
