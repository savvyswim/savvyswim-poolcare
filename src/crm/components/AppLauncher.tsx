import { useEffect, useRef, useState } from "react";
import { Link } from "@/lib/router-compat";
import { Grid2x2, Check } from "lucide-react";
import { WORKSPACES, type Workspace, type WorkspaceKey } from "@/crm/lib/workspaces";

export function AppLauncher({
  active,
  available,
  onPick,
}: {
  active: WorkspaceKey;
  available: Workspace[];
  onPick: (ws: Workspace) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const current = available.find((w) => w.key === active) ?? available[0] ?? WORKSPACES[0]!;
  const CurrentIcon = current.icon;

  return (
    <div className="relative" ref={ref}>
      <button
        className="ss-btn ss-btn-ghost flex items-center gap-2"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Grid2x2 size={15} />
        <CurrentIcon size={15} />
        <span className="hidden sm:inline">{current.label}</span>
      </button>

      {open ? (
        <div
          className="ss-card absolute left-0 z-50 mt-2 w-[min(92vw,420px)] p-2"
          role="menu"
        >
          <div className="ss-tag px-2 pb-1" style={{ fontSize: "0.5rem" }}>
            Switch workspace
          </div>
          <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
            {available.map((w) => {
              const Icon = w.icon;
              const isActive = w.key === active;
              return (
                <Link
                  key={w.key}
                  to={w.home}
                  className="flex items-start gap-2.5 rounded-[8px] p-2 !no-underline !text-inherit"
                  style={{ background: isActive ? "hsl(var(--ss-burgundy) / .08)" : "transparent" }}
                  onClick={() => {
                    onPick(w);
                    setOpen(false);
                  }}
                >
                  <span
                    className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px]"
                    style={{ background: "hsl(var(--ss-aqua) / .14)", color: "hsl(var(--ss-aqua))" }}
                  >
                    <Icon size={15} />
                  </span>
                  <span className="min-w-0">
                    <span className="flex items-center gap-1 text-[0.83rem] font-semibold">
                      {w.label}
                      {isActive ? <Check size={12} /> : null}
                    </span>
                    <span className="block text-[0.72rem] opacity-60">{w.blurb}</span>
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
