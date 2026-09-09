import { useEffect, useRef } from "react";
import { useRouterState } from "@tanstack/react-router";
import { trackSiteEvent } from "@/lib/site-analytics";

/**
 * First-party, anonymous page view counter. Records one event per page shown,
 * with the campaign tags from the URL, so paid traffic (Meta, Google) can be
 * measured against the leads it produces. No cookies, no identifiers.
 */
export default function PageViewTracker() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const last = useRef<string | null>(null);

  useEffect(() => {
    if (last.current === pathname) return;
    last.current = pathname;
    trackSiteEvent("page_view");
  }, [pathname]);

  return null;
}
