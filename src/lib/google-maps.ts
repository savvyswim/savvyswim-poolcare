const BROWSER_KEY = import.meta.env["VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY"] as
  | string
  | undefined;
const CHANNEL = import.meta.env["VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID"] as
  | string
  | undefined;

let mapsPromise: Promise<void> | null = null;
let authBlocked = false;
const authListeners = new Set<() => void>();

/**
 * True once Google has rejected the browser key on this domain
 * (RefererNotAllowedMapError / ApiNotActivatedMapError). Google reports this
 * asynchronously through window.gm_authFailure, never as a thrown error.
 */
export function isMapsAuthBlocked() {
  return authBlocked;
}

export function onMapsAuthBlocked(cb: () => void) {
  if (authBlocked) cb();
  authListeners.add(cb);
  return () => authListeners.delete(cb);
}

function markAuthBlocked() {
  if (authBlocked) return;
  authBlocked = true;
  // Measure how often Google rejects the browser key on this domain.
  void import("./site-analytics")
    .then((m) => m.trackSiteEvent("maps_auth_blocked"))
    .catch(() => undefined);
  authListeners.forEach((cb) => {
    try {
      cb();
    } catch {
      /* ignore listener errors */
    }
  });
}

export function loadMaps(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if (authBlocked) return Promise.reject(new Error("Google Maps browser key blocked on this domain"));
  if ((window as any).google?.maps?.importLibrary) return Promise.resolve();
  if (mapsPromise) return mapsPromise;
  if (!BROWSER_KEY) return Promise.reject(new Error("Missing Google Maps browser key"));

  (window as any).gm_authFailure = markAuthBlocked;


  mapsPromise = new Promise<void>((resolve, reject) => {
    (window as any).__ssMapsReady = () => resolve();
    const script = document.createElement("script");
    script.src =
      `https://maps.googleapis.com/maps/api/js?key=${BROWSER_KEY}` +
      `&libraries=places&loading=async&callback=__ssMapsReady` +
      (CHANNEL ? `&channel=${CHANNEL}` : "");
    script.async = true;
    script.onerror = () => reject(new Error("Failed to load Google Maps"));
    document.head.appendChild(script);
  });
  return mapsPromise;
}
