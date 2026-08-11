/**
 * /free-inspection — legacy lead form URL, now handled by the Savvy Swim app.
 */
import { createFileRoute, redirect } from "@tanstack/react-router";
import { leadUrl } from "@/lib/app-links";

export const Route = createFileRoute("/free-inspection")({
  beforeLoad: ({ search }) => {
    throw redirect({
      href: leadUrl("legacy_free_inspection", search as Record<string, string>),
      statusCode: 301,
      reloadDocument: true,
    });
  },
});
