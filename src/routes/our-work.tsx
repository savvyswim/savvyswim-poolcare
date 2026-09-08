import { createFileRoute } from "@tanstack/react-router";
import OurWork from "@/pages/OurWork";
import { SITE_URL } from "@/lib/structured-data";

const TITLE = "Our Work | Pools We Service Across DFW | Savvy Swim";
const DESCRIPTION =
  "Photos from pools Savvy Swim services every week across Dallas–Fort Worth, plus what a weekly plan includes.";
const URL = `${SITE_URL}/our-work`;

export const Route = createFileRoute("/our-work")({
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
  component: OurWork,
});
