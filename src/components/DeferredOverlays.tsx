import { lazy, Suspense, useEffect, useState } from "react";

import { useCart } from "@/hooks/useCart";

// Both overlays are invisible until the visitor interacts, so they stay out of
// the initial payload. The chat widget alone pulls in the AI SDK and the
// animation runtime, which is a large chunk to pay for on first paint.
const CartDrawer = lazy(() =>
  import("@/components/CartDrawer").then((m) => ({ default: m.CartDrawer })),
);
const ChatWidget = lazy(() =>
  import("@/components/ChatWidget").then((m) => ({ default: m.ChatWidget })),
);

/** Waits for the browser to go idle (or a first interaction) before mounting. */
function useDeferredMount(): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const show = () => {
      if (!cancelled) setReady(true);
    };

    const ric = (window as unknown as {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
    }).requestIdleCallback;

    const id = ric ? ric(show, { timeout: 3000 }) : window.setTimeout(show, 2000);

    window.addEventListener("pointerdown", show, { once: true, passive: true });
    window.addEventListener("keydown", show, { once: true });

    return () => {
      cancelled = true;
      if (!ric) window.clearTimeout(id as number);
      window.removeEventListener("pointerdown", show);
      window.removeEventListener("keydown", show);
    };
  }, []);

  return ready;
}

export function DeferredOverlays() {
  const ready = useDeferredMount();
  const { open } = useCart();

  return (
    <Suspense fallback={null}>
      {open && <CartDrawer />}
      {ready && <ChatWidget />}
    </Suspense>
  );
}

export default DeferredOverlays;
