import { Link } from "@/lib/router-compat";
import { Phone, Waves, CheckCircle2 } from "lucide-react";
import { PHONE_HREF, PHONE_VANITY } from "@/lib/contact-info";
import { BUSINESS_HOURS } from "@/lib/business-hours";
import { SERVICE_LOCATIONS } from "@/lib/service-locations";
import { onCallClick } from "@/components/CallButton";

/**
 * /offer, the paid social landing page.
 *
 * Built for cold traffic from a Facebook or Instagram ad: one offer, one
 * action. No site navigation and no outbound links, the only ways forward are
 * the survey and the phone. Campaign tags on the inbound ad link are captured
 * first-touch by the root attribution effect, so a lead that starts here is
 * still credited to the campaign after the visitor moves on to the survey.
 */

const PROOF = [
  {
    title: "Local weekly routes",
    body: "We run real routes across Dallas, Fort Worth and the north suburbs, so your pool sits on a fixed day.",
  },
  {
    title: "Real techs, same faces",
    body: "Trained pool techs on a weekly schedule, not a rotating crew you have never met.",
  },
  {
    title: "Clear pricing",
    body: "You see the plan and the price before anything starts. No surprise charges after the fact.",
  },
];

const STEPS = [
  {
    n: "01",
    title: "Answer 8 quick questions",
    body: "Takes about a minute. Tap the answers, then leave your name and phone.",
  },
  {
    n: "02",
    title: "We call to set the visit",
    body: "A real person calls to lock in a day and time that works for you.",
  },
  {
    n: "03",
    title: "Free inspection at your pool",
    body: "Full water test, full system check and a written report handed to you.",
  },
];

const INCLUDED = [
  "Complete water chemistry test",
  "Pump, filter and heater check",
  "Surface, skimmer and basket review",
  "Written report of what we find",
  "Free first filter clean when you switch",
];

export default function AdOffer() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-hairline bg-background">
        <div className="container-tight flex h-[64px] items-center justify-between gap-4 sm:h-[76px]">
          <div className="flex shrink-0 flex-col justify-center">
            <span className="whitespace-nowrap font-display text-[1.2rem] uppercase leading-none tracking-tight text-accent sm:text-[1.6rem]">
              Savvy Swim
            </span>
            <span className="mt-1 hidden whitespace-nowrap font-tech text-[10px] leading-tight text-primary/60 sm:block">
              On duty, so you don&rsquo;t have to be.
            </span>
          </div>
          <a
            href={PHONE_HREF}
            onClick={onCallClick("ad_offer_header")}
            className="inline-flex items-center gap-2 border border-hairline px-3 py-2 font-tech text-[11px] uppercase tracking-wide transition hover:text-accent sm:text-[12px]"
          >
            <Phone className="h-4 w-4 text-amber-brand" />
            {PHONE_VANITY}
          </a>
        </div>
      </header>

      <main>
        {/* Offer */}
        <section className="border-b border-hairline py-14 sm:py-20">
          <div className="container-tight max-w-3xl text-center">
            <p className="font-tech text-[11px] uppercase tracking-[0.2em] text-amber-brand">
              New customer offer
            </p>
            <h1 className="mt-4 font-display text-[2.4rem] uppercase leading-[0.95] tracking-tight sm:text-[3.6rem]">
              Your first pool inspection is free
              <span className="text-accent">.</span>
            </h1>
            <p className="mt-5 text-base leading-relaxed text-muted-foreground sm:text-lg">
              No commitment, nothing to sign. We run a full water test, check your
              whole system and hand you a complete report. Switch to Savvy Swim and
              your first filter cleaning is free too.
            </p>

            <div className="mt-8 flex flex-col items-center gap-3">
              <Link
                to="/survey"
                data-savvy-cta="ad_offer_primary"
                className="btn-quote inline-flex w-full max-w-sm items-center justify-center px-6 py-4 text-[14px] font-bold uppercase tracking-wide transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:text-[15px]"
              >
                Claim my free inspection
              </Link>
              <span className="font-tech text-[11px] uppercase tracking-wide text-primary/60">
                Takes about 60 seconds
              </span>
            </div>
          </div>
        </section>

        {/* What is included */}
        <section className="border-b border-hairline py-14 sm:py-16">
          <div className="container-tight max-w-3xl">
            <h2 className="font-display text-[1.7rem] uppercase leading-none tracking-tight sm:text-[2.2rem]">
              What the free inspection covers
              <span className="text-accent">.</span>
            </h2>
            <ul className="mt-6 space-y-3">
              {INCLUDED.map((item) => (
                <li key={item} className="flex items-start gap-3 leading-relaxed">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-amber-brand" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Proof */}
        <section className="border-b border-hairline py-14 sm:py-16">
          <div className="container-tight grid gap-8 sm:grid-cols-3">
            {PROOF.map((p) => (
              <div key={p.title} className="border border-hairline p-6">
                <h3 className="font-display text-[1.15rem] uppercase leading-none tracking-tight">
                  {p.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{p.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How it happens */}
        <section className="border-b border-hairline py-14 sm:py-16">
          <div className="container-tight max-w-3xl">
            <h2 className="font-display text-[1.7rem] uppercase leading-none tracking-tight sm:text-[2.2rem]">
              How it happens
              <span className="text-accent">.</span>
            </h2>
            <ol className="mt-8 space-y-7">
              {STEPS.map((s) => (
                <li key={s.n} className="flex gap-5">
                  <span className="font-display text-[1.6rem] leading-none text-amber-brand">
                    {s.n}
                  </span>
                  <div>
                    <h3 className="font-display text-[1.15rem] uppercase leading-none tracking-tight">
                      {s.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Where we run, hours, closing action */}
        <section className="py-14 sm:py-20">
          <div className="container-tight max-w-3xl">
            <h2 className="font-display text-[1.7rem] uppercase leading-none tracking-tight sm:text-[2.2rem]">
              Where we run
              <span className="text-accent">.</span>
            </h2>
            <p className="mt-5 leading-relaxed text-muted-foreground">
              Savvy Swim is a mobile pool service company across Dallas&ndash;Fort Worth.
              Weekly routes in{" "}
              {SERVICE_LOCATIONS.map((l, i) => (
                <span key={l.name}>
                  {i > 0 ? ", " : ""}
                  {l.name}
                </span>
              ))}
              .
            </p>

            <dl className="mt-8 border border-hairline p-6">
              <p className="flex items-center gap-2 font-display text-[1.1rem] uppercase leading-none tracking-tight">
                <Waves className="h-4 w-4 text-amber-brand" />
                Office hours
              </p>
              <div className="mt-4 space-y-2 text-sm">
                {BUSINESS_HOURS.map((row) => (
                  <div key={row.label} className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">{row.label}</dt>
                    <dd>{row.display}</dd>
                  </div>
                ))}
              </div>
            </dl>

            <div className="mt-10 flex flex-col items-center gap-3 text-center">
              <Link
                to="/survey"
                data-savvy-cta="ad_offer_footer"
                className="btn-quote inline-flex w-full max-w-sm items-center justify-center px-6 py-4 text-[14px] font-bold uppercase tracking-wide transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:text-[15px]"
              >
                Claim my free inspection
              </Link>
              <a
                href={PHONE_HREF}
                onClick={onCallClick("ad_offer_footer")}
                className="font-tech text-[12px] uppercase tracking-wide text-primary/70 transition hover:text-accent"
              >
                Or call {PHONE_VANITY}
              </a>
            </div>

            <p className="mt-10 text-center text-xs leading-relaxed text-muted-foreground">
              © {new Date().getFullYear()} Savvy Swim · A Santana &amp; Rivera Company.{" "}
              <Link to="/privacy-policy" className="underline transition hover:text-foreground">
                Privacy Policy
              </Link>{" "}
              ·{" "}
              <Link to="/terms-and-conditions" className="underline transition hover:text-foreground">
                Terms &amp; Conditions
              </Link>
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
