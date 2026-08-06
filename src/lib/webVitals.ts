import { supabase } from "@/integrations/supabase/client";

type MetricName = "LCP" | "CLS" | "INP" | "FCP" | "TTFB" | "LOAD";

export type VitalSample = {
  path: string;
  metric: MetricName;
  value: number;
  rating: string | null;
  device: string | null;
  connection: string | null;
  nav_type: string | null;
};

function deviceClass(): string {
  const w = window.innerWidth;
  if (w < 640) return "mobile";
  if (w < 1024) return "tablet";
  return "desktop";
}

function connectionType(): string | null {
  const c = (navigator as unknown as { connection?: { effectiveType?: string } }).connection;
  return c?.effectiveType ?? null;
}

const sent = new Set<string>();

function send(sample: VitalSample) {
  const key = `${sample.path}:${sample.metric}`;
  if (sent.has(key)) return;
  sent.add(key);
  void supabase
    .from("web_vitals")
    .insert(sample)
    .then(undefined, () => undefined);
}

/**
 * Collects Core Web Vitals for the current page and stores each sample so the
 * admin dashboard can chart real-user performance and spot regressions.
 * Safe to call once after hydration; it never throws and never blocks paint.
 */
export async function reportWebVitals(pathname: string) {
  if (typeof window === "undefined") return;
  try {
    const { onLCP, onCLS, onINP, onFCP, onTTFB } = await import("web-vitals");
    const base = {
      path: pathname.slice(0, 200),
      device: deviceClass(),
      connection: connectionType(),
      nav_type: (performance.getEntriesByType("navigation")[0] as
        | PerformanceNavigationTiming
        | undefined)?.type ?? null,
    };

    const push = (metric: MetricName) => (m: { value: number; rating?: string }) =>
      send({
        ...base,
        metric,
        value: Math.max(0, Math.min(599999, Math.round(metric === "CLS" ? m.value * 1000 : m.value))),
        rating: m.rating ?? null,
      });

    onLCP(push("LCP"));
    onCLS(push("CLS"));
    onINP(push("INP"));
    onFCP(push("FCP"));
    onTTFB(push("TTFB"));

    // Total load time (navigation duration) once the page is fully loaded.
    const reportLoad = () => {
      const nav = performance.getEntriesByType("navigation")[0] as
        | PerformanceNavigationTiming
        | undefined;
      if (!nav) return;
      send({ ...base, metric: "LOAD", value: Math.round(nav.loadEventEnd || nav.duration), rating: null });
    };
    if (document.readyState === "complete") reportLoad();
    else window.addEventListener("load", () => setTimeout(reportLoad, 0), { once: true });
  } catch {
    /* metrics are best-effort */
  }
}

/** Thresholds used to label a sample good / needs work / poor. */
export const VITAL_THRESHOLDS: Record<string, { good: number; poor: number; unit: string; label: string }> = {
  LCP: { good: 2500, poor: 4000, unit: "ms", label: "Largest Contentful Paint" },
  CLS: { good: 100, poor: 250, unit: "cls", label: "Cumulative Layout Shift" },
  INP: { good: 200, poor: 500, unit: "ms", label: "Interaction to Next Paint" },
  FCP: { good: 1800, poor: 3000, unit: "ms", label: "First Contentful Paint" },
  TTFB: { good: 800, poor: 1800, unit: "ms", label: "Time to First Byte" },
  LOAD: { good: 3000, poor: 6000, unit: "ms", label: "Full page load" },
};

export function formatVital(metric: string, value: number): string {
  if (metric === "CLS") return (value / 1000).toFixed(3);
  if (value >= 1000) return `${(value / 1000).toFixed(2)} s`;
  return `${Math.round(value)} ms`;
}

export function vitalRating(metric: string, value: number): "good" | "needs-work" | "poor" {
  const t = VITAL_THRESHOLDS[metric];
  if (!t) return "good";
  if (value <= t.good) return "good";
  if (value <= t.poor) return "needs-work";
  return "poor";
}
