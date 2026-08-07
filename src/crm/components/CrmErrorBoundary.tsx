import { Component, type ReactNode } from "react";
import { AlertTriangle, RotateCw, Timer } from "lucide-react";
import "@/crm/crm.css";
import { backoffDelay, classifyError, retryMessage, type RetryKind } from "@/crm/lib/retry";
import { reportCrmError } from "@/crm/lib/errorReporting";

type Props = { children: ReactNode; resetKey?: string };
type State = {
  error: Error | null;
  kind: RetryKind;
  attempt: number;
  retries: number;
  countdown: number;
};

const AUTO_RETRY_LIMIT = 3;

/**
 * One consistent failure surface for every CRM screen. Any render or data
 * error inside a page bubbles here instead of blanking the console, and the
 * retry button remounts the subtree so the page refetches from scratch.
 *
 * Rate limits (429) and timeouts retry themselves on an exponential backoff
 * — waiting is the fix for those — while a real error waits for the user.
 */
export class CrmErrorBoundary extends Component<Props, State> {
  override state: State = { error: null, kind: "fatal", attempt: 0, retries: 0, countdown: 0 };
  private timer: ReturnType<typeof setInterval> | null = null;

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error, kind: classifyError(error) };
  }

  override componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    void reportCrmError(error, {
      source: "CrmErrorBoundary",
      resetKey: this.props.resetKey ?? null,
      retries: this.state.retries,
      componentStack: (info.componentStack ?? "").slice(0, 2000),
    });

    const kind = classifyError(error);
    if (kind !== "fatal" && this.state.retries < AUTO_RETRY_LIMIT) {
      this.scheduleRetry(backoffDelay(this.state.retries, kind, error));
    }
  }

  override componentDidUpdate(prev: Props) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) {
      this.clearTimer();
      this.setState({ error: null, retries: 0, countdown: 0 });
    }
  }

  override componentWillUnmount() {
    this.clearTimer();
  }

  private clearTimer() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private scheduleRetry(delay: number) {
    this.clearTimer();
    this.setState({ countdown: Math.ceil(delay / 1000) });
    this.timer = setInterval(() => {
      this.setState((s) => {
        if (s.countdown <= 1) {
          this.clearTimer();
          queueMicrotask(() =>
            this.setState((x) => ({
              error: null,
              attempt: x.attempt + 1,
              retries: x.retries + 1,
              countdown: 0,
            })),
          );
          return { countdown: 0 };
        }
        return { countdown: s.countdown - 1 };
      });
    }, 1000);
  }

  retry = () => {
    this.clearTimer();
    this.setState((s) => ({ error: null, attempt: s.attempt + 1, retries: 0, countdown: 0 }));
  };

  override render() {
    if (!this.state.error) {
      return <div key={this.state.attempt}>{this.props.children}</div>;
    }

    const { kind, countdown, retries } = this.state;
    const autoRetrying = countdown > 0;

    return (
      <div className="ss-card mx-auto mt-10 max-w-md p-6 text-center">
        {autoRetrying ? (
          <Timer size={20} className="mx-auto" style={{ color: "hsl(var(--ss-aqua))" }} />
        ) : (
          <AlertTriangle size={20} className="mx-auto" style={{ color: "hsl(var(--ss-burgundy))" }} />
        )}
        <h2 className="mt-3 text-[0.95rem] font-semibold">
          {autoRetrying ? "Hang on — reconnecting" : "This screen didn’t load"}
        </h2>
        <p className="mt-2 text-[0.85rem] opacity-70">
          {autoRetrying
            ? `${retryMessage(kind)} Retrying in ${countdown}s${retries ? ` (attempt ${retries + 1})` : ""}.`
            : "We couldn’t reach the data for this page. Nothing was lost — try again."}
        </p>
        <p className="mt-2 truncate text-[0.7rem] opacity-45" title={this.state.error.message}>
          {this.state.error.message}
        </p>
        <button className="ss-btn mt-4 inline-flex" onClick={this.retry}>
          <RotateCw size={13} /> {autoRetrying ? "Retry now" : "Try again"}
        </button>
      </div>
    );
  }
}

export default CrmErrorBoundary;
