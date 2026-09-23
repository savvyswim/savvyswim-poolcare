import { createFileRoute } from "@tanstack/react-router";
import Survey from "@/pages/Survey";
import { SITE_URL } from "@/lib/structured-data";

const TITLE = "Pool Care Survey | Free Pool Inspection from Savvy Swim";
const DESCRIPTION =
  "Answer 8 quick questions about your pool service and claim a free inspection from Savvy Swim, including a full water test and system report across DFW.";
const URL = `${SITE_URL}/survey`;

export const Route = createFileRoute("/survey")({
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
  component: Survey,
});
