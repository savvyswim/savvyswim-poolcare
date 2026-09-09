import { Link } from "@/lib/router-compat";
import { Phone, CheckCircle2, MapPin } from "lucide-react";
import { CallButton, StickyCallBar, onCallClick } from "@/components/CallButton";
import { goToLead } from "@/lib/site-analytics";
import LocalSeoBlurb from "@/components/LocalSeoBlurb";
import type { ServiceArea } from "@/lib/serviceAreas";
import {
  buildPricingFaq,
  buildTiers,
  PRICE_FACTORS,
  PRICING_AREAS,
  priceOnly,
  SWIM_CLUB_PRICE,
} from "@/lib/city-pricing";

const PHONE_DISPLAY = "817-663-7665";
const PHONE_HREF = "tel:+18176637665";

export default function CityPricing({ area }: { area: ServiceArea }) {
  const city = area.name;
  const tiers = buildTiers(area);
  const faq = buildPricingFaq(area);
  const nearby = PRICING_AREAS.filter((a) => a.slug !== area.slug).slice(0, 6);

  return (
    <div className="min-h-screen overflow-x-hidden">
      <header className="border-b border-hairline bg-background">
        <div className="container-tight flex h-[64px] items-center justify-between gap-3 sm:h-[76px] sm:gap-4">
          <Link to="/" aria-label="Savvy Swim home" className="flex min-w-0 shrink items-center gap-3">
            <span className="whitespace-nowrap font-display text-[1.15rem] uppercase leading-none tracking-tight text-accent xs:text-[1.3rem] sm:text-[1.6rem] lg:text-[1.9rem]">
              Savvy Swim
            </span>
          </Link>
          <nav className="hidden min-w-0 flex-1 items-center justify-center gap-4 overflow-hidden whitespace-nowrap font-tech text-primary/70 md:flex lg:gap-7">
            <Link to="/" className="shrink-0 hover:text-accent transition">Home</Link>
            <Link to="/services" className="shrink-0 hover:text-accent transition">Services</Link>
            <Link to="/services" hash="membership" className="shrink-0 hover:text-accent transition">Swim Club</Link>
            <Link to="/" hash="contact" className="shrink-0 hover:text-accent transition">Contact</Link>
          </nav>
          <CallButton location={`${area.slug}_pricing_header`} />
        </div>
      </header>

      <main>
        {/* HERO */}
        <section className="border-b border-hairline">
          <div className="container-tight py-14 sm:py-20">
            <div className="border-t-2 border-accent pt-6">
              <div className="font-tech text-[11px] uppercase tracking-[0.24em] text-muted-foreground mb-4 inline-flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5" /> {city}, Texas · {area.zips}
              </div>
              <h1 className="font-display uppercase leading-[0.94] tracking-tight" style={{ fontSize: "clamp(2.1rem, 5vw, 3.9rem)" }}>
                {city} pool service<br />
                <span className="text-accent">pricing.</span>
              </h1>
              <p className="mt-6 max-w-2xl text-muted-foreground text-base leading-relaxed">
                Weekly service in {city} starts at{" "}
                <strong className="text-foreground">{priceOnly(area.startingPrice)} a month</strong>, chemicals
                included. Flat monthly rate, no per visit billing, no contract. Below is exactly what that
                covers and what moves the number.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <button
                  type="button"
                  onClick={() => goToLead(`pricing_${area.slug}`)}
                  data-savvy-cta="request_quote"
                  className="btn-quote inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-md px-6 py-3.5 sm:w-auto text-[13px] font-bold uppercase tracking-wide transition"
                >
                  Book a free inspection
                </button>
                <a
                  href={PHONE_HREF}
                  onClick={onCallClick(`${area.slug}_pricing_hero`)}
                  className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-md border border-hairline px-6 py-3.5 sm:w-auto text-[13px] font-bold uppercase tracking-wide hover:text-primary transition"
                >
                  <Phone className="h-4 w-4" /> {PHONE_DISPLAY}
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* TIERS */}
        <section className="perf-section py-14 sm:py-20 border-b border-hairline">
          <div className="container-tight">
            <h2 className="font-display text-[1.9rem] sm:text-[2.4rem] uppercase tracking-tight leading-none">
              {city} plans<span className="text-accent">.</span>
            </h2>
            <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
              {tiers.map((tier) => (
                <div key={tier.name} className="flex flex-col border border-hairline p-6 sm:p-7">
                  <h3 className="font-display text-[1.3rem] uppercase tracking-tight">{tier.name}</h3>
                  <p className="mt-3 font-display text-[1.7rem] leading-none text-accent">
                    {tier.price ?? "Quoted at your walkthrough"}
                  </p>
                  <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{tier.blurb}</p>
                  <ul className="mt-5 space-y-2.5 text-sm">
                    {tier.items.map((item) => (
                      <li key={item} className="flex gap-2.5">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                        <span className="text-muted-foreground">{item}</span>
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    onClick={() => goToLead(`pricing_${area.slug}_${tier.name.toLowerCase().replace(/\s+/g, "_")}`)}
                    data-savvy-cta="request_quote"
                    className="btn-quote mt-7 inline-flex min-h-12 items-center justify-center gap-2 rounded-md px-5 py-3 text-[12px] font-bold uppercase tracking-wide transition"
                  >
                    Get my {city} price
                  </button>
                </div>
              ))}
            </div>
            <p className="mt-6 text-sm text-muted-foreground">
              Swim Club is an add-on at {SWIM_CLUB_PRICE}, stacked on top of your service price. On a{" "}
              {priceOnly(area.startingPrice)} pool that is {priceOnly(area.startingPrice)} plus 19.99 a month.
            </p>
          </div>
        </section>

        {/* WHAT CHANGES YOUR PRICE */}
        <section className="perf-section py-14 sm:py-20 border-b border-hairline">
          <div className="container-tight grid grid-cols-1 gap-10 lg:grid-cols-2">
            <div>
              <h2 className="font-display text-[1.9rem] sm:text-[2.4rem] uppercase tracking-tight leading-none">
                What changes your price<span className="text-accent">.</span>
              </h2>
              <p className="mt-4 max-w-md text-muted-foreground leading-relaxed">
                Two {city} pools on the same street can price differently. These are the only things that move
                the number, and we walk every one of them with you before quoting.
              </p>
            </div>
            <ul className="space-y-3">
              {PRICE_FACTORS.map((factor) => (
                <li key={factor} className="flex gap-3 border-b border-hairline pb-3 text-muted-foreground">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                  <span>{factor}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* FAQ */}
        <section className="perf-section py-14 sm:py-20 border-b border-hairline">
          <div className="container-tight max-w-3xl">
            <h2 className="font-display text-[1.9rem] sm:text-[2.4rem] uppercase tracking-tight leading-none">
              {city} pricing questions<span className="text-accent">.</span>
            </h2>
            <div className="mt-8 divide-y divide-hairline border-t border-hairline">
              {faq.map((f) => (
                <div key={f.q} className="py-5">
                  <h3 className="font-display text-[1.05rem] uppercase tracking-tight">{f.q}</h3>
                  <p className="mt-2 text-muted-foreground leading-relaxed">{f.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <LocalSeoBlurb city={city} />

        {/* NEARBY + CTA */}
        <section className="perf-section py-14 sm:py-20">
          <div className="container-tight">
            <div className="border border-hairline rounded-sm p-8 sm:p-12">
              <h2 className="font-display text-[1.8rem] sm:text-[2.4rem] uppercase tracking-tight leading-none">
                Get your exact {city} price
              </h2>
              <p className="mt-3 max-w-xl text-muted-foreground">
                A tech walks the pool and equipment pad, tests the water, and gives you a flat monthly number.
                Free, no contract, and you can start on the next {city} route day.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <button
                  type="button"
                  onClick={() => goToLead(`pricing_${area.slug}_cta`)}
                  data-savvy-cta="request_quote"
                  className="btn-quote inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-md px-6 py-3.5 sm:w-auto text-[13px] font-bold uppercase tracking-wide transition"
                >
                  Book a free inspection
                </button>
                <a
                  href={PHONE_HREF}
                  onClick={onCallClick(`${area.slug}_pricing_cta`)}
                  className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-md border border-hairline px-6 py-3.5 sm:w-auto text-[13px] font-bold uppercase tracking-wide hover:text-primary transition"
                >
                  <Phone className="h-4 w-4" /> {PHONE_DISPLAY}
                </a>
              </div>

              <div className="mt-10 border-t border-hairline pt-6">
                <p className="font-tech text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
                  Pricing in nearby cities
                </p>
                <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
                  {nearby.map((a) => (
                    <Link
                      key={a.slug}
                      to="/$city/pricing"
                      params={{ city: a.slug }}
                      className="text-muted-foreground hover:text-accent transition"
                    >
                      {a.name} pricing
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <StickyCallBar />
    </div>
  );
}
