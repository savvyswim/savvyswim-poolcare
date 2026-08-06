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
    const t = window.setTimeout(() => void reportWebVitals(pathname), 0);
    return () => window.clearTimeout(t);
  }, [pathname]);

  return null;
}

export default PerfMonitor;
