/**
 * Thank-you card, rendered in the browser instead of a flat JPG so it stays
 * sharp on every screen. 23 vertical bands (12 red, 11 cream) so both outer
 * edges always end on a full red stripe.
 */
import { PHONE_VANITY_WITH_DIGITS } from "@/lib/contact-info";

const BAND = 100 / 23;

export default function ThankYouCard({ className = "" }: { className?: string }) {
  return (
    <div
      className={`relative mx-auto aspect-square w-full max-w-[440px] shrink-0 p-[6%] shadow-[0_24px_60px_-28px_rgba(42,16,19,0.55)] ${className}`}
      style={{
        containerType: "inline-size",
        background: `repeating-linear-gradient(90deg,#B3323A 0 ${BAND}%,#F7F2EA ${BAND}% ${BAND * 2}%)`,
      }}
      aria-label="Thank you from Savvy Swim, your pool is in good hands"
    >
      <div className="relative flex h-full w-full flex-col items-center justify-center bg-[#BCD9EC] px-[6%] text-center text-[#5A1418]">
        <span
          className="-rotate-3 text-[15cqw] leading-none"
          style={{ fontFamily: "'Caveat', 'Segoe Script', cursive", fontWeight: 600 }}
        >
          thank you
        </span>

        <h3
          className="mt-[3%] whitespace-nowrap text-[15cqw] uppercase leading-[0.95] tracking-[0.005em]"
          style={{ fontFamily: "'Anton', Impact, sans-serif", color: "#5A1418", fontWeight: 400 }}
        >
          Your pool is in
          <br />
          good hands.
        </h3>

        <p
          className="mt-[6%] text-[7.5cqw] uppercase leading-none tracking-[0.02em]"
          style={{ fontFamily: "'Anton', sans-serif", color: "#5A1418", fontWeight: 400 }}
        >
          savvyswim.com
        </p>
        <p className="mt-[2%] text-[5.4cqw] leading-none tracking-[0.03em]">
          {PHONE_VANITY_WITH_DIGITS}
        </p>

        <span
          className="absolute bottom-[6%] right-[6%] -rotate-12 text-[6.5cqw] leading-none"
          style={{ fontFamily: "'Caveat', 'Segoe Script', cursive", fontWeight: 600 }}
        >
          see you soon
        </span>
      </div>
    </div>
  );
}
