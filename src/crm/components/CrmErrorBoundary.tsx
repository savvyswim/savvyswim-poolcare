import { Component, type ReactNode } from "react";
import { AlertTriangle, RotateCw } from "lucide-react";
import "@/crm/crm.css";

type Props = { children: ReactNode; resetKey?: string };
type State = { error: Error | null; attempt: number };

/**
 * One consistent failure surface for every CRM screen. Any render or data
 * error inside a page bubbles here instead of blanking the console, and the
 * retry button remounts the subtree so the page refetches from scratch.
 */
export class CrmErrorBoundary extends Component<Props, State> {
  override state: State = { error: null, attempt: 0 };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  override componentDidUpdate(prev: Props) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  retry = () => this.setState((s) => ({ error: null, attempt: s.attempt + 1 }));

  override render() {
    if (!this.state.error) {
      return <div key={this.state.attempt}>{this.props.children}</div>;
    }

    return (
      <div className="ss-card mx-auto mt-10 max-w-md p-6 text-center">
        <AlertTriangle size={20} className="mx-auto" style={{ color: "hsl(var(--ss-burgundy))" }} />
        <h2 className="mt-3 text-[0.95rem] font-semibold">This screen didn&rsquo;t load</h2>
        <p className="mt-2 text-[0.85rem] opacity-70">
          We couldn&rsquo;t reach the data for this page. Nothing was lost — try again.
        </p>
        <p className="mt-2 truncate text-[0.7rem] opacity-45" title={this.state.error.message}>
          {this.state.error.message}
        </p>
        <button className="ss-btn mt-4 inline-flex" onClick={this.retry}>
          <RotateCw size={13} /> Try again
        </button>
      </div>
    );
  }
}

export default CrmErrorBoundary;
