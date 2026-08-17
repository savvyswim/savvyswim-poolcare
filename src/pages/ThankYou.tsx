/**
 * Post-submit confirmation page.
 *
 * Every lead form (booking modal, water test tab, city pages) lands here after
 * a successful submit so the customer gets a branded receipt, the reference
 * number, a one-tap call link and a "save our contact" vCard.
 */
import { Link } from "@tanstack/react-router";
import { CallLink } from "@/components/CallButton";
import { PHONE_VANITY_WITH_DIGITS } from "@/lib/contact-info";

export type ThankYouProps = {
  reference?: string | undefined;
  date?: string | undefined;
  time?: string | undefined;
  kind?: string | undefined;
  email?: string | undefined;
};

const STEPS = [
  {
    n: "01",
    title: "Check your inbox",
    body: "A confirmation just went out from notify@savvyswimservices.com with everything you told us. If it isn't there in a few minutes, look in promotions or spam.",
  },
  {
    n: "02",
    title: "We call to confirm",
    body: "A Savvy Swim tech confirms your window by phone or text within one business day — no phone tag, no call center.",
  },
  {
    n: "03",
    title: "We show up on time",
    body: "Photos before and after, full water chemistry, and a written report the same day we visit.",
  },
];

function prettyDate(value?: string | undefined): string | null {
  if (!value) return null;
  const parts = value.split("-").map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return value;
  const d = new Date(parts[0]!, parts[1]! - 1, parts[2]!);
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

export default function ThankYou({ reference, date, time, kind, email }: ThankYouProps) {
  const when = prettyDate(date);
  const isWaterTest = (kind ?? "").includes("water");

  return (
    <main className="min-h-screen bg-[#F4EFE3] text-[#2a1013]">
      {/* Riviera stripe */}
      <div className="h-2 w-full bg-[repeating-linear-gradient(90deg,#8E1F2C_0_28px,#F4EFE3_28px_56px)]" />

      <section className="mx-auto w-full max-w-3xl px-5 py-14 sm:py-20">
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#1FA9BE]">
          {isWaterTest ? "Water test booked" : "Request received"}
        </p>
        <h1 className="mt-3 font-display text-4xl uppercase leading-[0.92] text-[#8E1F2C] sm:text-6xl">
          You&apos;re on the board
        </h1>
        <p className="mt-4 max-w-xl text-[16px] leading-relaxed text-[#2a1013]/80">
          Thank you — your request is in front of our dispatch team.{" "}
          {when ? (
            <>
              We have you down for{" "}
              <strong className="text-[#8E1F2C]">
                {when}
                {time ? ` at ${time}` : ""}
              </strong>
              .{" "}
            </>
          ) : null}
          We&apos;ll confirm within one business day.
        </p>

        {reference ? (
          <div className="mt-6 inline-block border border-[#8E1F2C]/25 bg-white px-5 py-3">
            <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-[#2a1013]/55">
              Reference
            </span>
            <div className="font-display text-2xl uppercase text-[#8E1F2C]">{reference}</div>
          </div>
        ) : null}

        {email ? (
          <p className="mt-4 text-[14px] text-[#2a1013]/70">
            Confirmation emailed to <strong>{email}</strong>.
          </p>
        ) : null}

        {/* Actions */}
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <CallLink
            location="thank_you_page"
            className="flex min-h-[52px] items-center justify-center bg-[#8E1F2C] px-6 text-sm font-semibold uppercase tracking-[0.12em] text-[#F4EFE3]"
          >
            Call {PHONE_VANITY_WITH_DIGITS}
          </CallLink>
          <a
            href="/savvy-swim.vcf"
            download="savvy-swim.vcf"
            className="flex min-h-[52px] items-center justify-center border border-[#8E1F2C]/30 bg-white px-6 text-sm font-semibold uppercase tracking-[0.12em] text-[#8E1F2C]"
          >
            Save our contact
          </a>
        </div>
        <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.2em] text-[#2a1013]/50">
          Tap &quot;Save our contact&quot; on your phone to add Savvy Swim to your contacts.
        </p>

        {/* What happens next */}
        <div className="mt-14 border-t border-[#8E1F2C]/20 pt-10">
          <h2 className="font-display text-2xl uppercase text-[#8E1F2C]">What happens next</h2>
          <ol className="mt-6 space-y-6">
            {STEPS.map((s) => (
              <li key={s.n} className="flex gap-5">
                <span className="font-mono text-[12px] tracking-[0.2em] text-[#1FA9BE]">{s.n}</span>
                <div>
                  <h3 className="font-display text-lg uppercase text-[#2a1013]">{s.title}</h3>
                  <p className="mt-1 text-[15px] leading-relaxed text-[#2a1013]/75">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="mt-12 flex flex-wrap gap-x-6 gap-y-2 border-t border-[#8E1F2C]/20 pt-6 font-mono text-[11px] uppercase tracking-[0.2em] text-[#8E1F2C]">
          <Link to="/">Back to home</Link>
          <Link to="/services">Our services</Link>
          <Link to="/weekly-pool-service">Weekly plans</Link>
          <a href="mailto:hi@savvyswim.com">hi@savvyswim.com</a>
        </div>
      </section>

      <div className="h-2 w-full bg-[repeating-linear-gradient(90deg,#1FA9BE_0_28px,#F4EFE3_28px_56px)]" />
    </main>
  );
}
