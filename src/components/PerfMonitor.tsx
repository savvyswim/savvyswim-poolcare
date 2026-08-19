import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";
import { reportWebVitals } from "@/lib/webVitals";

/**
 * Client-only real-user monitoring. Captures Core Web Vitals for the current
 * page after hydration and stores each sample so the CRM can chart trends.
 */
export function PerfMonitor() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    // Measuring must never compete with painting: wait for an idle moment.
    const idle = (window as unknown as {
      requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number;
    }).requestIdleCallback;
    if (idle) {
      const id = idle(() => void reportWebVitals(pathname), { timeout: 4000 });
      return () => (window as unknown as { cancelIdleCallback?: (i: number) => void })
        .cancelIdleCallback?.(id);
    }
    const t = window.setTimeout(() => void reportWebVitals(pathname), 1200);
    return () => window.clearTimeout(t);
  }, [pathname]);

  return null;
}

export default PerfMonitor;
