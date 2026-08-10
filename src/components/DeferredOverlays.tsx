import { lazy, Suspense } from "react";

import { useCart } from "@/hooks/useCart";

// The cart drawer is invisible until the visitor opens it, so it stays out of
// the initial payload.
const CartDrawer = lazy(() =>
  import("@/components/CartDrawer").then((m) => ({ default: m.CartDrawer })),
);

export function DeferredOverlays() {
  const { open } = useCart();

  return <Suspense fallback={null}>{open && <CartDrawer />}</Suspense>;
}

export default DeferredOverlays;
