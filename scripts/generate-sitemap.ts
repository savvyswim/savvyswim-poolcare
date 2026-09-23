// Runs before `vite dev` and `vite build` (predev/prebuild hooks); writes public/sitemap.xml.

import { writeFileSync } from "fs";
import { resolve } from "path";

/** Primary domain. Every other domain 301s here, so only this one is listed. */
const BASE_URL = "https://savvyswim.com";

interface SitemapEntry {
  path: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

const CITY_SLUGS = [
  "dallas",
  "plano",
  "mckinney",
  "allen",
  "richardson",
  "highland-park",
  "university-park",
  "garland",
  "irving",
  "rockwall",
  "prosper",
];

// Only canonical, self-serving URLs belong here. /book and /free-inspection
// are 301 redirects, and /pool-cleaning-plano, /frisco, /pool-cleaning-frisco,
// /privacy-policy and /terms-and-conditions canonicalise elsewhere.
const entries: SitemapEntry[] = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/services", changefreq: "monthly", priority: "0.9" },
  { path: "/service-areas", changefreq: "monthly", priority: "0.9" },
  { path: "/weekly-pool-service", changefreq: "monthly", priority: "0.9" },
  { path: "/schedule", changefreq: "monthly", priority: "0.9" },
  { path: "/survey", changefreq: "monthly", priority: "0.8" },
  { path: "/pool-cleaning-frisco-tx", changefreq: "monthly", priority: "0.8" },
  ...CITY_SLUGS.map((slug): SitemapEntry => ({
    path: `/${slug}`,
    changefreq: "monthly",
    priority: "0.8",
  })),
  ...[...CITY_SLUGS, "frisco"].map((slug): SitemapEntry => ({
    path: `/${slug}/pricing`,
    changefreq: "monthly",
    priority: "0.7",
  })),
  { path: "/leave-a-review", changefreq: "monthly", priority: "0.6" },
  { path: "/privacy", changefreq: "yearly", priority: "0.3" },
  { path: "/terms", changefreq: "yearly", priority: "0.3" },
];




function generateSitemap(list: SitemapEntry[]) {
  const urls = list.map((e) =>
    [
      `  <url>`,
      `    <loc>${BASE_URL}${e.path}</loc>`,
      e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
      e.priority ? `    <priority>${e.priority}</priority>` : null,
      `  </url>`,
    ]
      .filter(Boolean)
      .join("\n"),
  );

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...urls,
    `</urlset>`,
  ].join("\n");
}

writeFileSync(resolve("public/sitemap.xml"), generateSitemap(entries));
console.log(`sitemap.xml written (${entries.length} entries)`);
