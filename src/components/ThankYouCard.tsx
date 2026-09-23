/**
 * Thank-you card, rendered in the browser instead of a flat JPG so it stays
 * razor sharp on every screen and loads instantly.
 */
import { PHONE_VANITY_WITH_DIGITS } from "@/lib/contact-info";

export default function ThankYouCard({ className = "" }: { className?: string }) {
  return (
    <div
      className={`relative mx-auto aspect-square w-full max-w-[440px] p-[7%] shadow-[0_18px_50px_-18px_rgba(42,16,19,0.45)] ${className}`}
      style={{
        containerType: "inline-size",
        background:
          "repeating-linear-gradient(90deg,#8E1F2C 0 4.5%,#F4EFE3 4.5% 9%)",
      }}
      aria-label="Thank you from Savvy Swim, your pool is in good hands"
    >
      <div className="relative flex h-full w-full flex-col items-center justify-center bg-[#BEE3ED] px-[8%] text-center text-[#8E1F2C]">
        <span className="pointer-events-none absolute inset-[4%] border border-[#8E1F2C]/20" />

        <span
          className="text-[clamp(28px,9.5cqw,46px)] leading-none"
          style={{ fontFamily: "'Caveat', 'Segoe Script', cursive" }}
        >
          thank you
        </span>

        <h3 className="mt-[4%] font-display text-[clamp(26px,11cqw,50px)] font-extrabold uppercase leading-[0.88] tracking-[-0.02em]">
          Your pool is in
          <br />
          good hands.
        </h3>

        <p className="mt-[8%] font-display text-[clamp(15px,5.4cqw,25px)] font-bold uppercase tracking-[0.06em]">
          savvyswim.com
        </p>
        <p className="mt-[1%] font-mono text-[clamp(13px,4.4cqw,20px)] tracking-[0.04em]">
          {PHONE_VANITY_WITH_DIGITS}
        </p>

        <span
          className="absolute bottom-[7%] right-[8%] -rotate-6 text-[clamp(14px,4.6cqw,22px)] leading-none text-[#8E1F2C]/85"
          style={{ fontFamily: "'Caveat', 'Segoe Script', cursive" }}
        >
          see you soon
        </span>
      </div>
    </div>
  );
}
