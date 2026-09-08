/**
 * /book, legacy booking URL. Booking now happens in the on-site quote form,
 * so this permanently redirects home with the form auto-opened.
 */
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/book")({
  beforeLoad: () => {
    throw redirect({ to: "/", search: { quote: "1", source: "legacy_book" }, statusCode: 301 });
  },
});
