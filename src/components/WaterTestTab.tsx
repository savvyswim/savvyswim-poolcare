/**
 * Slim vertical tab pinned to the left edge that opens the free water test
 * form. Mirrors the "Request a Quote" tab on the right; becomes a compact
 * floating pill on mobile.
 */
import { Droplets } from "lucide-react";
import { openWaterTestModal } from "@/components/QuoteModal";

export default function WaterTestTab() {
  return (
    <>
      <button
        type="button"
        onClick={() => openWaterTestModal()}
        aria-label="Book a free water test — opens the Savvy Swim water test form"
        data-savvy-cta="water_test"
        className="hidden lg:flex fixed left-0 top-1/2 z-40 -translate-y-1/2 items-center gap-2 bg-[#1FA9BE] px-3 py-6 text-[11px] font-bold uppercase tracking-[0.22em] text-[#F4EFE3] shadow-cta transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        style={{ writingMode: "vertical-rl", rotate: "180deg" }}
      >
        Free Water Test
      </button>

      <button
        type="button"
        onClick={() => openWaterTestModal("water_test_pill")}
        aria-label="Book a free water test — opens the Savvy Swim water test form"
        data-savvy-cta="water_test"
        className="lg:hidden fixed bottom-24 left-3 z-40 inline-flex items-center gap-2 bg-[#1FA9BE] px-3.5 py-2.5 text-[11px] font-bold uppercase tracking-[0.12em] text-[#F4EFE3] shadow-cta focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <Droplets className="h-4 w-4" />
        Water Test
      </button>
    </>
  );
}
