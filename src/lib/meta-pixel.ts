/**
 * Meta (Facebook / Instagram) Pixel.
 *
 * Loads only after the visitor accepts on the cookie bar, so nothing
 * third-party runs for someone who declined. The pixel id comes from
 * VITE_META_PIXEL_ID; with no id set, every function here is a no-op.
 */

import { getConsent } from "@/lib/consent";

type Fbq = ((...args: unknown[]) => void) & { queue?: unknown[]; loaded?: boolean; version?: string; callMethod?: unknown };

declare global {
  interface Window {
    fbq?: Fbq;
    _fbq?: Fbq;
  }
}

export const META_PIXEL_ID: string =
  (import.meta.env['VITE_META_PIXEL_ID'] as string | undefined)?.trim() || "";

let loaded = false;

function injectBaseCode() {
  if (loaded || typeof window === "undefined" || !META_PIXEL_ID) return;
  if (window.fbq) {
    loaded = true;
    return;
  }
  const fbq: Fbq = function (...args: unknown[]) {
    if (fbq.callMethod) (fbq.callMethod as (...a: unknown[]) => void).apply(fbq, args);
    else (fbq.queue = fbq.queue || []).push(args);
  } as Fbq;
  fbq.queue = [];
  fbq.version = "2.0";
  window.fbq = fbq;
  window._fbq = fbq;

  const script = document.createElement("script");
  script.async = true;
  script.src = "https://connect.facebook.net/en_US/fbevents.js";
  document.head.appendChild(script);

  loaded = true;
  fbq("init", META_PIXEL_ID);
}

/** Start the pixel if (and only if) the visitor accepted tracking. */
export function initMetaPixel(): boolean {
  if (typeof window === "undefined" || !META_PIXEL_ID) return false;
  if (getConsent() !== "accepted") return false;
  injectBaseCode();
  return true;
}

export function metaTrack(event: string, params?: Record<string, unknown>) {
  if (!initMetaPixel()) return;
  window.fbq?.("track", event, params);
}

export function metaPageView() {
  metaTrack("PageView");
}

/** A completed quote / free inspection request. */
export function metaTrackLead(params?: Record<string, unknown>) {
  metaTrack("Lead", params);
}
