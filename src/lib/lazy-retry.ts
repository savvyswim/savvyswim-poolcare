import { lazy, type ComponentType } from "react";

/**
 * After a new deploy the old hashed chunks disappear, so a still-open tab that
 * lazy-loads one fails with "Importing a module script failed" and blanks the
 * page. Retry once, then force a single hard reload to pick up the new build.
 */
const RELOAD_FLAG = "ss_chunk_reloaded";

export function lazyWithReload<T extends ComponentType<never>>(
  factory: () => Promise<{ default: T }>,
) {
  return lazy(async () => {
    try {
      const mod = await factory();
      try {
        window.sessionStorage.removeItem(RELOAD_FLAG);
      } catch {
        /* private mode */
      }
      return mod;
    } catch (error) {
      if (typeof window === "undefined") throw error;
      let alreadyReloaded = false;
      try {
        alreadyReloaded = window.sessionStorage.getItem(RELOAD_FLAG) === "1";
        window.sessionStorage.setItem(RELOAD_FLAG, "1");
      } catch {
        /* private mode — fall through to a single reload attempt */
      }
      if (alreadyReloaded) throw error;
      window.location.reload();
      // Keep the boundary from flashing while the reload happens.
      return await new Promise<{ default: T }>(() => {});
    }
  });
}
