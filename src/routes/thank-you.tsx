import { createFileRoute } from "@tanstack/react-router";
import ThankYou from "@/pages/ThankYou";
import { SITE_URL } from "@/lib/structured-data";

const TITLE = "Thank You | Your Savvy Swim Request Is In";
const DESCRIPTION =
  "Your pool service request is confirmed. Save our contact, call 817-663-POOL, and see what happens next with Savvy Swim across DFW.";
const URL = `${SITE_URL}/thank-you`;

type ThankYouSearch = {
  ref?: string;
  date?: string;
  time?: string;
  kind?: string;
  email?: string;
};

const str = (v: unknown): string | undefined =>
  typeof v === "string" && v.trim() ? v.trim().slice(0, 120) : undefined;

export const Route = createFileRoute("/thank-you")({
  validateSearch: (search: Record<string, unknown>): ThankYouSearch => ({
    ...(str(search['ref']) ? { ref: str(search['ref'])! } : {}),
    ...(str(search['date']) ? { date: str(search['date'])! } : {}),
    ...(str(search['time']) ? { time: str(search['time'])! } : {}),
    ...(str(search['kind']) ? { kind: str(search['kind'])! } : {}),
    ...(str(search['email']) ? { email: str(search['email'])! } : {}),
  }),
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: URL },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: URL }],
  }),
  component: ThankYouRoute,
});

function ThankYouRoute() {
  const search = Route.useSearch();
  return (
    <ThankYou
      reference={search.ref}
      date={search.date}
      time={search.time}
      kind={search.kind}
      email={search.email}
    />
  );
}
