/**
 * Host detection so one deployment can serve both the marketing site
 * (savvyswim.com) and the app front door (savvyswim.app).
 */
const APP_HOSTS = ["savvyswim.app", "www.savvyswim.app", "app.savvyswim.com"];

export function isAppHost(hostname: string = typeof window !== "undefined" ? window.location.hostname : "") {
  return APP_HOSTS.includes(hostname.toLowerCase());
}

export function useAppHost() {
  return isAppHost();
}

export const MARKETING_ORIGIN = "https://www.savvyswim.com";
