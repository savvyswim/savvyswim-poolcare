const BROWSER_KEY = import.meta.env["VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY"] as
  | string
  | undefined;
const CHANNEL = import.meta.env["VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID"] as
  | string
  | undefined;

let mapsPromise: Promise<void> | null = null;

export function loadMaps(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if ((window as any).google?.maps?.importLibrary) return Promise.resolve();
  if (mapsPromise) return mapsPromise;
  if (!BROWSER_KEY) return Promise.reject(new Error("Missing Google Maps browser key"));

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
