/**
 * /book, the booking page. Captures name, phone, service address and a
 * preferred date so a free-inspection request becomes a real appointment.
 */
import { createFileRoute } from "@tanstack/react-router";
import Schedule from "@/pages/Schedule";
import { SITE_URL } from "@/lib/structured-data";

const TITLE = "Book a Free Pool Inspection in DFW | Savvy Swim";
const DESC =
  "Book your free pool inspection in Dallas-Fort Worth. Give us your name, phone, address and a day that works, and we confirm your appointment within one business day.";
const URL = `${SITE_URL}/book`;

const str = (value: unknown, max: number): string | undefined => {
  if (typeof value !== "string") return undefined;
  const clean = value.trim().slice(0, max);
  return clean || undefined;
};

export const Route = createFileRoute("/book")({
  validateSearch: (search: Record<string, unknown>) => ({
    name: str(search["name"], 120),
    phone: str(search["phone"], 20),
    email: str(search["email"], 160),
    address: str(search["address"], 200),
    ref: str(search["ref"], 40),
  }),
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { property: "og:url", content: URL },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESC },
    ],
    links: [{ rel: "canonical", href: URL }],
  }),
  component: BookPage,
});

function BookPage() {
  const { name, phone, email, address, ref } = Route.useSearch();
  const prefilled = Boolean(name || phone || email || address);
  return (
    <Schedule
      source={ref ? "book_page_followup" : "book_page"}
      prefill={prefilled ? { name, phone, email, address } : undefined}
    />
  );
}

