import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";
import { CONSENT_EVENT } from "@/lib/consent";
import { META_PIXEL_ID, initMetaPixel, metaPageView } from "@/lib/meta-pixel";

/**
 * Mounts the Meta pixel after hydration and reports a page view on every
 * route change. Waits for an accepted cookie choice, and starts as soon as
 * the visitor accepts without needing a reload.
 */
export default function MetaPixel() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!META_PIXEL_ID) return;
    const start = () => {
      if (initMetaPixel()) metaPageView();
    };
    start();
    window.addEventListener(CONSENT_EVENT, start);
    return () => window.removeEventListener(CONSENT_EVENT, start);
  }, [pathname]);

  return null;
}
