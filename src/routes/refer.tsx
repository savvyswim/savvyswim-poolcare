import { createFileRoute } from "@tanstack/react-router";
import Refer from "@/pages/Refer";
import { SITE_URL } from "@/lib/structured-data";

const TITLE = "Refer a Neighbor, Get a Free Month | Savvy Swim";
const DESCRIPTION =
  "Share your Savvy Swim referral code: your neighbor gets 20% off their first month of pool service and you get a free month of service.";
const URL = `${SITE_URL}/refer`;

export const Route = createFileRoute("/refer")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: URL },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: URL }],
  }),
  component: Refer,
});
