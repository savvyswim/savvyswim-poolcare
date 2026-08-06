import { Link } from "@/lib/router-compat";

export function SavvyLogo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const scale = { sm: "1.05rem", md: "1.45rem", lg: "2.4rem" }[size];
  const tag = { sm: "0.42rem", md: "0.5rem", lg: "0.66rem" }[size];
  return (
    <Link to="/admin/crm" className="block !text-inherit no-underline">
      <div className="ss-logo" style={{ fontSize: scale }}>
        SAVVY
        <br />
        SWIM
      </div>
      <div className="ss-tag mt-1" style={{ fontSize: tag }}>
        On duty, so you don't have to be.
      </div>
    </Link>
  );
}

export function StripeBand() {
  return <div className="ss-stripe" />;
}

const CHIP_TONES: Record<string, { bg: string; fg: string; bd: string }> = {
  green: { bg: "hsl(var(--ss-green) / 0.12)", fg: "hsl(var(--ss-green))", bd: "hsl(var(--ss-green) / 0.3)" },
  aqua: { bg: "hsl(var(--ss-aqua) / 0.12)", fg: "hsl(188 74% 30%)", bd: "hsl(var(--ss-aqua) / 0.3)" },
  orange: { bg: "hsl(var(--ss-orange) / 0.14)", fg: "hsl(27 86% 38%)", bd: "hsl(var(--ss-orange) / 0.32)" },
  pink: { bg: "hsl(var(--ss-pink) / 0.14)", fg: "hsl(330 62% 42%)", bd: "hsl(var(--ss-pink) / 0.3)" },
  gold: { bg: "hsl(var(--ss-gold) / 0.18)", fg: "hsl(35 78% 32%)", bd: "hsl(var(--ss-gold) / 0.45)" },
  burgundy: { bg: "hsl(var(--ss-burgundy) / 0.1)", fg: "hsl(var(--ss-burgundy))", bd: "hsl(var(--ss-burgundy) / 0.28)" },
  ink: { bg: "hsl(var(--ss-ink) / 0.07)", fg: "hsl(var(--ss-ink) / 0.72)", bd: "hsl(var(--ss-ink) / 0.15)" },
};

export function Chip({
  tone = "ink",
  children,
}: {
  tone?: keyof typeof CHIP_TONES;
  children: React.ReactNode;
}) {
  const t = CHIP_TONES[tone] ?? CHIP_TONES["ink"]!;
  return (
    <span className="ss-chip" style={{ background: t.bg, color: t.fg, borderColor: t.bd }}>
      {children}
    </span>
  );
}

export function SectionTitle({
  title,
  sub,
  right,
}: {
  title: string;
  sub?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div>
        <h2 className="text-[0.95rem] leading-tight">{title}</h2>
        {sub && <p className="mt-0.5 text-[0.75rem] opacity-60">{sub}</p>}
      </div>
      {right}
    </div>
  );
}

export function StatTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "hero";
}) {
  return (
    <div className={tone === "hero" ? "ss-hero p-3" : "ss-card p-3"}>
      <div className="ss-tag" style={{ fontSize: "0.55rem", color: tone === "hero" ? "rgba(255,255,255,.7)" : undefined }}>
        {label}
      </div>
      <div className="ss-num mt-1 text-[1.35rem] font-bold leading-none">{value}</div>
    </div>
  );
}

/** White life-ring arc on burgundy. */
export function RouteRing({ done, total }: { done: number; total: number }) {
  const pct = total ? done / total : 0;
  const r = 30;
  const c = 2 * Math.PI * r;
  return (
    <svg width="76" height="76" viewBox="0 0 76 76" className="ss-ring">
      <circle cx="38" cy="38" r={r} fill="none" stroke="rgba(255,255,255,.25)" strokeWidth="8" />
      <circle
        cx="38"
        cy="38"
        r={r}
        fill="none"
        stroke="#fff"
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={`${c * pct} ${c}`}
      />
    </svg>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="ss-card p-6 text-center text-[0.85rem] opacity-60">{children}</div>
  );
}
