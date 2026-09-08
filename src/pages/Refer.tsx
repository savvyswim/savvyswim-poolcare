import Seo from "@/components/Seo";
import { Link } from "@/lib/router-compat";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { StickyCallBar } from "@/components/CallButton";
import { goToSwimClub } from "@/lib/site-analytics";

const STEPS = [
  {
    n: "01",
    t: "Share your code",
    d: "Every active customer gets a personal referral code in their welcome email and portal.",
  },
  {
    n: "02",
    t: "They save 20%",
    d: "Your neighbor gets 20% off their first month when they start 12 months of full service.",
  },
  {
    n: "03",
    t: "You get a free month",
    d: "Once their first month is paid, a full month of your service is credited to your account.",
  },
];

const Refer = () => (
  <div className="min-h-screen overflow-x-hidden">
    <Seo
      title="Refer a Neighbor, Get a Free Month | Savvy Swim"
      description="Share your Savvy Swim referral code. Your neighbor gets 20% off their first month of pool service and you get a free month of service."
      path="/refer"
    />
    <SiteHeader />

    <main>
      <section className="border-y border-hairline bg-navy-brand py-20 sm:py-28">
        <div className="container-tight grid items-center gap-12 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <div className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-chlorine">
              Refer a neighbor
            </div>
            <h1 className="font-editorial text-[2.2rem] italic leading-[1.05] text-canvas sm:text-[3rem] lg:text-[3.5rem]">
              Get a free month.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-canvas/70 lg:text-[1.1rem] lg:leading-[1.75]">
              For every neighbor who signs up for 12 months of full service with your code, you get
              a free month of service. They get 20% off their first month.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => goToSwimClub("referral")}
                className="font-display bg-lifeguard px-8 py-4 text-base uppercase tracking-[0.15em] text-primary-foreground transition-colors hover:bg-canvas hover:text-navy-brand"
              >
                Get my referral code
              </button>
              <Link
                to="/"
                hash="contact"
                className="font-display border border-canvas/30 px-8 py-4 text-base uppercase tracking-[0.15em] text-canvas transition-colors hover:border-canvas"
              >
                Ask a question
              </Link>
            </div>

            <p className="mt-4 text-xs leading-relaxed text-canvas/50">
              Free month credits after the neighbor&apos;s first paid month on a 12-month
              full-service agreement. Unlimited referrals. Credits apply to your service rate and
              can&apos;t be exchanged for cash.
            </p>
          </div>

          <div className="grid gap-3">
            {STEPS.map((s) => (
              <div key={s.n} className="flex gap-5 border border-canvas/15 bg-canvas/[0.04] p-6">
                <span className="font-badge text-2xl leading-none text-chlorine">{s.n}</span>
                <div>
                  <div className="text-sm font-semibold uppercase tracking-wide text-canvas">{s.t}</div>
                  <p className="mt-1.5 text-xs leading-relaxed text-canvas/65">{s.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>

    <SiteFooter />
    <StickyCallBar />
  </div>
);

export default Refer;
