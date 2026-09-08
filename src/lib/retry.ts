/**
 * Retry strategy for CRM data calls.
 *
 * The CRM talks to one API, so the two failures that actually happen are
 * rate limits (429) and slow/hung requests (timeouts, 5xx, dropped network).
 * Those are worth retrying with exponential backoff + jitter; a 400 or a
 * permission error is not, retrying it just makes the screen slower.
 */

export type RetryKind = "rate_limit" | "timeout" | "server" | "network" | "fatal";

const RATE_LIMIT_BASE_MS = 1_200;
const TRANSIENT_BASE_MS = 400;
const MAX_DELAY_MS = 15_000;

type ErrorLike = {
  status?: number;
  code?: string;
  name?: string;
  message?: string;
  retryAfter?: number;
};

function asErrorLike(err: unknown): ErrorLike {
  if (!err || typeof err !== "object") return { message: String(err ?? "") };
  return err as ErrorLike;
}

/** Sort a failure into a retry bucket. */
export function classifyError(err: unknown): RetryKind {
  const e = asErrorLike(err);
  const msg = (e.message ?? "").toLowerCase();
  const status = typeof e.status === "number" ? e.status : Number(e.code) || 0;

  if (status === 429 || msg.includes("too many requests") || msg.includes("rate limit")) {
    return "rate_limit";
  }
  if (e.name === "AbortError" || msg.includes("timeout") || msg.includes("timed out") || status === 408) {
    return "timeout";
  }
  if (status >= 500 || msg.includes("gateway") || msg.includes("service unavailable")) {
    return "server";
  }
  if (msg.includes("failed to fetch") || msg.includes("network") || msg.includes("load failed")) {
    return "network";
  }
  return "fatal";
}

export function isRetryable(err: unknown): boolean {
  return classifyError(err) !== "fatal";
}

/** Seconds the server asked us to wait, when it bothered to say. */
function retryAfterMs(err: unknown): number | null {
  const e = asErrorLike(err);
  if (typeof e.retryAfter === "number" && e.retryAfter > 0) return e.retryAfter * 1000;
  const header = (err as { headers?: { get?: (k: string) => string | null } })?.headers?.get?.(
    "retry-after",
  );
  const secs = header ? Number(header) : NaN;
  return Number.isFinite(secs) && secs > 0 ? secs * 1000 : null;
}

/**
 * Exponential backoff with full jitter, so a page with eight parallel
 * queries doesn't retry all of them on the same tick and re-trip the limit.
 */
export function backoffDelay(attempt: number, kind: RetryKind, err?: unknown): number {
  const honored = retryAfterMs(err);
  if (honored != null) return Math.min(honored, MAX_DELAY_MS);
  const base = kind === "rate_limit" ? RATE_LIMIT_BASE_MS : TRANSIENT_BASE_MS;
  const ceiling = Math.min(base * 2 ** attempt, MAX_DELAY_MS);
  return Math.round(ceiling / 2 + Math.random() * (ceiling / 2));
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export type RetryOptions = {
  /** Extra attempts after the first try. Rate limits get one more on top. */
  retries?: number;
  /** Hard cap per attempt; a hung request is a timeout, not a hang. */
  timeoutMs?: number;
  onRetry?: (info: { attempt: number; delay: number; kind: RetryKind; error: unknown }) => void;
};

/** Fail an attempt that never comes back, so backoff can take over. */
export function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => {
      const err = new Error("Request timed out");
      err.name = "AbortError";
      reject(err);
    }, ms);
    p.then(
      (v) => { clearTimeout(t); resolve(v); },
      (e) => { clearTimeout(t); reject(e); },
    );
  });
}

/** Run `fn`, retrying only the failures that deserve it. */
export async function withRetry<T>(fn: () => Promise<T>, opts: RetryOptions = {}): Promise<T> {
  const { retries = 3, timeoutMs = 15_000, onRetry } = opts;
  let attempt = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      return await withTimeout(fn(), timeoutMs);
    } catch (error) {
      const kind = classifyError(error);
      const budget = kind === "rate_limit" ? retries + 1 : retries;
      if (kind === "fatal" || attempt >= budget) throw error;
      const delay = backoffDelay(attempt, kind, error);
      onRetry?.({ attempt: attempt + 1, delay, kind, error });
      await sleep(delay);
      attempt += 1;
    }
  }
}

export function retryMessage(kind: RetryKind): string {
  switch (kind) {
    case "rate_limit":
      return "The server is throttling us for a moment. Retrying with a longer pause…";
    case "timeout":
      return "That request took too long. Retrying…";
    case "server":
      return "The server hiccuped. Retrying…";
    case "network":
      return "Connection dropped. Retrying…";
    default:
      return "That request failed.";
  }
}
