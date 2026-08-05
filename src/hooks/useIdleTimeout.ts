import { useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  ABSOLUTE_LIMIT_MS,
  WARN_BEFORE_MS,
  idleLimitMs,
  isSharedDevice,
  lastActivity,
  markActivity,
  sessionStart,
  startSessionClock,
} from "@/lib/sessionSecurity";

const ACTIVITY_EVENTS = ["pointerdown", "keydown", "scroll", "touchstart", "visibilitychange"];

/**
 * Signs the admin out after a period of inactivity, and again at a hard
 * 12-hour cap. Activity is shared across tabs through localStorage, so an
 * active tab keeps the whole session alive and an expiry logs out everywhere.
 */
export function useIdleTimeout(active: boolean, onExpire: (reason: "idle" | "max") => void) {
  const warned = useRef(false);
  const expired = useRef(false);

  useEffect(() => {
    if (!active) {
      warned.current = false;
      expired.current = false;
      return;
    }

    startSessionClock();
    if (!lastActivity()) markActivity();

    const bump = () => {
      if (document.visibilityState === "hidden") return;
      warned.current = false;
      markActivity();
    };

    ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, bump, { passive: true }));

    const tick = window.setInterval(() => {
      if (expired.current) return;
      const now = Date.now();
      const idleFor = now - (lastActivity() || now);
      const limit = idleLimitMs();
      const started = sessionStart() || now;

      if (now - started >= ABSOLUTE_LIMIT_MS) {
        expired.current = true;
        onExpire("max");
        return;
      }
      if (idleFor >= limit) {
        expired.current = true;
        onExpire("idle");
        return;
      }
      if (!warned.current && idleFor >= limit - WARN_BEFORE_MS) {
        warned.current = true;
        toast.warning("You'll be signed out in about a minute for inactivity.", {
          description: "Tap anywhere to stay signed in.",
        });
      }
    }, 15000);

    // Shared / public device: drop the session as soon as the tab goes away.
    const onPageHide = () => {
      if (!isSharedDevice()) return;
      try {
        Object.keys(localStorage)
          .filter((k) => k.startsWith("sb-") && k.endsWith("-auth-token"))
          .forEach((k) => localStorage.removeItem(k));
      } catch {
        /* storage unavailable */
      }
    };
    window.addEventListener("pagehide", onPageHide);

    return () => {
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, bump));
      window.removeEventListener("pagehide", onPageHide);
      window.clearInterval(tick);
    };
  }, [active, onExpire]);
}
