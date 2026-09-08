import { createFileRoute } from "@tanstack/react-router";
import LeaveReview from "@/pages/LeaveReview";
import { SITE_URL } from "@/lib/structured-data";

const TITLE = "Leave a Review | Savvy Swim Pool Service";
const DESCRIPTION =
  "Tell us how your Savvy Swim pool service went. Rate your tech, leave a few words, and help other DFW pool owners choose with confidence.";

export const Route = createFileRoute("/leave-a-review")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: `${SITE_URL}/leave-a-review` },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/leave-a-review` }],
  }),
  component: LeaveReview,
});
