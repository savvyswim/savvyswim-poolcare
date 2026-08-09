import type { ReactNode } from "react";

/** Page title block used at the top of every workspace screen. */
export function PageHeader({
  eyebrow,
  title,
  sub,
  actions,
}: {
  eyebrow?: string;
  title: string;
  sub?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        {eyebrow ? (
          <div className="ss-tag" style={{ fontSize: "0.55rem" }}>
            {eyebrow}
          </div>
        ) : null}
        <h1 className="mt-1 text-[1.5rem] leading-tight">{title}</h1>
        {sub ? <p className="mt-1 text-[0.85rem] opacity-65">{sub}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

/** White card with an optional header row. */
export function Panel({
  title,
  sub,
  right,
  children,
  className = "",
}: {
  title?: string;
  sub?: string;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`ss-panel ${className}`}>
      {title ? (
        <div className="ss-panel-head">
          <div className="min-w-0">
            <h3 className="text-[0.9rem] leading-tight">{title}</h3>
            {sub ? <p className="mt-0.5 text-[0.72rem] opacity-60">{sub}</p> : null}
          </div>
          {right}
        </div>
      ) : null}
      <div className="ss-panel-body">{children}</div>
    </section>
  );
}

const TREND_COLOR: Record<string, string> = {
  up: "hsl(var(--ss-green))",
  down: "hsl(var(--ss-burgundy))",
  flat: "hsl(var(--ss-ink) / 0.5)",
};

/** KPI tile: label, big number, optional delta line. */
export function StatCard({
  label,
  value,
  hint,
  trend,
  icon,
}: {
  label: string;
  value: string;
  hint?: string;
  trend?: "up" | "down" | "flat";
  icon?: ReactNode;
}) {
  return (
    <div className="ss-panel">
      <div className="ss-panel-body">
        <div className="flex items-start justify-between gap-2">
          <div className="ss-tag" style={{ fontSize: "0.55rem" }}>
            {label}
          </div>
          {icon ? <span className="opacity-40">{icon}</span> : null}
        </div>
        <div className="ss-num mt-2 text-[1.6rem] font-bold leading-none">{value}</div>
        {hint ? (
          <div className="mt-1.5 text-[0.72rem]" style={{ color: TREND_COLOR[trend ?? "flat"] }}>
            {hint}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** Simple horizontal bar used in list breakdowns. */
export function BarRow({
  label,
  value,
  max,
  display,
  tone = "aqua",
}: {
  label: string;
  value: number;
  max: number;
  display?: string;
  tone?: "aqua" | "burgundy" | "green" | "gold";
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="py-1.5">
      <div className="flex items-baseline justify-between gap-3 text-[0.8rem]">
        <span className="min-w-0 truncate">{label}</span>
        <span className="ss-num font-semibold">{display ?? value}</span>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full" style={{ background: "hsl(var(--ss-ink) / 0.08)" }}>
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, background: `hsl(var(--ss-${tone}))` }}
        />
      </div>
    </div>
  );
}
