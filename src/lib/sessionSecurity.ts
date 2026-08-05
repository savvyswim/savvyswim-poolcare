/**
 * Session security settings for the admin / CRM area.
 *
 * Note: Lovable Cloud auth stores its session as a token in browser storage
 * (not a cookie), so there are no cookie flags to set. The equivalent
 * protections are implemented here: idle timeout, an absolute session cap,
 * and a shared-device mode that drops the session when the tab closes.
 */

export const IDLE_LIMIT_MS = 30 * 60 * 1000; // 30 min on a private device
export const SHARED_IDLE_LIMIT_MS = 10 * 60 * 1000; // 10 min on a shared device
export const ABSOLUTE_LIMIT_MS = 12 * 60 * 60 * 1000; // hard cap since sign-in
export const WARN_BEFORE_MS = 60 * 1000;

const SHARED_KEY = "savvy-shared-device";
export const LAST_ACTIVITY_KEY = "savvy-last-activity";
export const SESSION_START_KEY = "savvy-session-start";

export function isSharedDevice(): boolean {
  try {
    return localStorage.getItem(SHARED_KEY) === "1";
  } catch {
    return false;
  }
}

export function setSharedDevice(shared: boolean) {
  try {
    if (shared) localStorage.setItem(SHARED_KEY, "1");
    else localStorage.removeItem(SHARED_KEY);
  } catch {
    /* storage unavailable */
  }
}

export function idleLimitMs(): number {
  return isSharedDevice() ? SHARED_IDLE_LIMIT_MS : IDLE_LIMIT_MS;
}

export function markActivity(ts = Date.now()) {
  try {
    localStorage.setItem(LAST_ACTIVITY_KEY, String(ts));
  } catch {
    /* storage unavailable */
  }
}

export function lastActivity(): number {
  try {
    return Number(localStorage.getItem(LAST_ACTIVITY_KEY)) || 0;
  } catch {
    return 0;
  }
}

export function startSessionClock(ts = Date.now()) {
  try {
    if (!localStorage.getItem(SESSION_START_KEY)) {
      localStorage.setItem(SESSION_START_KEY, String(ts));
    }
  } catch {
    /* storage unavailable */
  }
}

export function sessionStart(): number {
  try {
    return Number(localStorage.getItem(SESSION_START_KEY)) || 0;
  } catch {
    return 0;
  }
}

export function clearSessionClock() {
  try {
    localStorage.removeItem(LAST_ACTIVITY_KEY);
    localStorage.removeItem(SESSION_START_KEY);
  } catch {
    /* storage unavailable */
  }
}
