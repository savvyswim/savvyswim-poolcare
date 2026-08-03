import { useEffect } from "react";
import { useShopifyCart } from "@/stores/shopifyCart";

export function useCartSync() {
  const syncCart = useShopifyCart((state) => state.syncCart);

  useEffect(() => {
    syncCart();
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") syncCart();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [syncCart]);
}
