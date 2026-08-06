import { useEffect } from "react";
import { useLocation } from "@/lib/router-compat";

/** Instantly jumps to the top on route change so page transitions feel immediate. */
export function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname]);
  return null;
}
