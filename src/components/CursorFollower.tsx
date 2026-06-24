import { useEffect, useRef, useState } from "react";

export const CursorFollower = () => {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);
  const [hovering, setHovering] = useState(false);

  // target + current positions
  const target = useRef({ x: -100, y: -100 });
  const outer = useRef({ x: -100, y: -100 });
  const inner = useRef({ x: -100, y: -100 });
  const drop = useRef({ x: -100, y: -100 });

  useEffect(() => {
    // Disable on touch / coarse pointers
    const mq = window.matchMedia("(pointer: fine)");
    if (!mq.matches) return;
    setEnabled(true);

    const onMove = (e: PointerEvent) => {
      target.current.x = e.clientX;
      target.current.y = e.clientY;
    };

    const onOver = (e: PointerEvent) => {
      const t = e.target as HTMLElement | null;
      const isInteractive =
        !!t?.closest(
          'a, button, [role="button"], input, textarea, select, [data-cursor="hover"]'
        );
      setHovering(isInteractive);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerover", onOver, { passive: true });

    let raf = 0;
    const tick = () => {
      // lerp factors create the trailing flow
      const ease1 = 0.22; // inner ring (fast)
      const ease2 = 0.12; // outer ring (slow)
      const ease3 = 0.32; // droplet (fastest, near pointer)

      inner.current.x += (target.current.x - inner.current.x) * ease1;
      inner.current.y += (target.current.y - inner.current.y) * ease1;
      outer.current.x += (target.current.x - outer.current.x) * ease2;
      outer.current.y += (target.current.y - outer.current.y) * ease2;
      drop.current.x += (target.current.x - drop.current.x) * ease3;
      drop.current.y += (target.current.y - drop.current.y) * ease3;

      if (innerRef.current)
        innerRef.current.style.transform = `translate3d(${inner.current.x}px, ${inner.current.y}px, 0) translate(-50%, -50%)`;
      if (outerRef.current)
        outerRef.current.style.transform = `translate3d(${outer.current.x}px, ${outer.current.y}px, 0) translate(-50%, -50%)`;
      if (dropRef.current)
        dropRef.current.style.transform = `translate3d(${drop.current.x}px, ${drop.current.y}px, 0) translate(-50%, -50%)`;

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerover", onOver);
    };
  }, []);

  if (!enabled) return null;

  const scale = hovering ? 1.6 : 1;

  return (
    <div className="pointer-events-none fixed inset-0 z-[100] hidden md:block">
      <div
        ref={outerRef}
        style={{
          width: 120,
          height: 120,
          borderRadius: "9999px",
          border: "1px solid hsl(var(--foreground) / 0.25)",
          position: "fixed",
          left: 0,
          top: 0,
          transition: "width 400ms cubic-bezier(.22,1,.36,1), height 400ms cubic-bezier(.22,1,.36,1), border-color 300ms",
          mixBlendMode: "difference",
        }}
        className={hovering ? "!w-[160px] !h-[160px]" : ""}
      />
      <div
        ref={innerRef}
        style={{
          width: 56,
          height: 56,
          borderRadius: "9999px",
          border: "1px solid hsl(var(--foreground) / 0.55)",
          position: "fixed",
          left: 0,
          top: 0,
          backdropFilter: "blur(2px)",
          transition: "width 300ms cubic-bezier(.22,1,.36,1), height 300ms cubic-bezier(.22,1,.36,1)",
        }}
        className={hovering ? "!w-[78px] !h-[78px]" : ""}
      />
      <div
        ref={dropRef}
        style={{
          position: "fixed",
          left: 0,
          top: 0,
          width: 18,
          height: 18,
          transform: `translate(-50%, -50%) scale(${scale})`,
          transition: "transform 250ms cubic-bezier(.22,1,.36,1)",
          color: "hsl(var(--amber-brand, 38 92% 55%))",
          filter: "drop-shadow(0 0 8px hsl(var(--amber-brand, 38 92% 55%) / 0.55))",
        }}
      >
        <svg viewBox="0 0 24 24" fill="currentColor" width="100%" height="100%">
          <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0L12 2.69z" />
        </svg>
      </div>
    </div>
  );
};

export default CursorFollower;
