/**
 * Defers the lead modal until it is actually needed.
 *
 * The modal carries the whole booking form (calendar, address autocomplete,
 * date formatting), so mounting it on every page load costs first-paint budget
 * on phones. This host is tiny: it listens for the open event (and the legacy
 * ?quote=1 deep link), then loads the modal and replays the event once mounted.
 */
import { lazy, Suspense, useEffect, useState } from "react";
import { QUOTE_EVENT, openQuoteModal, type QuoteDetail } from "@/lib/quote-modal";

const QuoteModal = lazy(() => import("@/components/QuoteModal"));

export default function QuoteModalHost() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (mounted) return;

    let pending: QuoteDetail | null = null;

    const onOpen = (e: Event) => {
      pending = (e as CustomEvent<QuoteDetail>).detail || {};
      setMounted(true);
    };
    window.addEventListener(QUOTE_EVENT, onOpen as EventListener);

    const params = new URLSearchParams(window.location.search);
    if (params.get("quote") === "1") {
      pending = { source: params.get("source") || "deep_link" };
      setMounted(true);
    }

    return () => {
      window.removeEventListener(QUOTE_EVENT, onOpen as EventListener);
      // Replay the click that triggered the load, once the modal is listening.
      if (pending) {
        const detail = pending;
        window.setTimeout(() => openQuoteModal(detail), 0);
      }
    };
  }, [mounted]);

  if (!mounted) return null;

  return (
    <Suspense fallback={null}>
      <QuoteModal />
    </Suspense>
  );
}
