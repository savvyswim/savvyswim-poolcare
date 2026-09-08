import { createFileRoute } from "@tanstack/react-router";
import Terms from "@/pages/Terms";

/** Alias of /terms — canonical points at the primary URL. */
const CANONICAL = "https://savvyswimservices.com/terms";
const TITLE = "Terms of Service | Savvy Swim Pool Service";
const DESCRIPTION =
  "The terms that cover Savvy Swim pool cleaning, repairs and Swim Club membership: scheduling, access, cancellations, billing and service guarantees.";

export const Route = createFileRoute("/terms-and-conditions")({
  component: Terms,
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: "Terms of Service | Savvy Swim" },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: CANONICAL },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Terms of Service | Savvy Swim" },
      { name: "twitter:description", content: DESCRIPTION },
    ],
    links: [{ rel: "canonical", href: CANONICAL }],
  }),
});
