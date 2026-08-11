/**
 * /book — legacy booking URL.
 *
 * Booking now happens in the Savvy Swim app, so this route permanently
 * redirects (301) and carries campaign attribution across.
 */
import { createFileRoute, redirect } from "@tanstack/react-router";
import { leadUrl } from "@/lib/app-links";

export const Route = createFileRoute("/book")({
  beforeLoad: ({ search }) => {
    throw redirect({
      href: leadUrl("legacy_book", search as Record<string, string>),
      statusCode: 301,
      reloadDocument: true,
    });
  },
});
