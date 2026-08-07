import { useEffect } from "react";

/**
 * Progressive scroll reveal: fades + lifts any element marked with
 * [data-reveal] as it enters the viewport. No-ops for reduced motion.
 */
export default function ScrollReveal() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const nodes = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));

    if (reduce || !("IntersectionObserver" in window)) {
      nodes.forEach((n) => n.classList.add("is-revealed"));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-revealed");
            io.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.06 },
    );

    nodes.forEach((n) => {
      // Anything already in view on load reveals immediately (no flash).
      const rect = n.getBoundingClientRect();
      if (rect.top < window.innerHeight * 0.9) n.classList.add("is-revealed");
      else io.observe(n);
    });

    return () => io.disconnect();
  }, []);

  return null;
}
