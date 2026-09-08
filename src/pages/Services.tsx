import { INSTAGRAM_URL } from "@/lib/contact-info";
import { Link } from "@/lib/router-compat";
import {
  Instagram,
  Waves,
  Phone,
  ArrowRight,
  MessageSquare,
} from "lucide-react";
import Seo from "@/components/Seo";
import { buildSmsHref, trackContactClick } from "@/lib/contactTracking";
import { CallButton, StickyCallBar, onCallClick } from "@/components/CallButton";
import { goToLead, goToSwimClub } from "@/lib/site-analytics";
import ServiceAreaMap from "@/components/ServiceAreaMap";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const MEMBERSHIP_FAQ = [
  {
    q: "What is the Savvy Swim Club?",
    a: "It's our $19.99/month membership for pool owners in DFW. Members get 25% off filter cleans, 10% off services and 10% off parts, priority scheduling, and 24/7 text support with our techs. It works alongside any cleaning plan, or on its own if you maintain the pool yourself.",
  },
  {
    q: "How does billing work?",
    a: "Membership is $19.99 per month, charged automatically to the card on file on the same day each month. The first charge happens the day you join, and your perks are active immediately. Service visits, repairs, and parts are invoiced separately. The membership fee never covers the work itself.",
  },
  {
    q: "How long is the commitment?",
    a: "The Swim Club runs on a 12-month agreement billed monthly. After the first 12 months it continues month to month, so you can stay on at the same rate or stop any time with no further obligation.",
  },
  {
    q: "How do I cancel?",
    a: "Text or email us and we'll cancel your renewal. No phone maze, no cancellation fee after the initial 12-month term. During the term, cancellation ends your monthly perks and any remaining months of the agreement are due; if your situation changes, like selling the home, let us know and we'll work with you.",
  },
  {
    q: "What isn't included?",
    a: "The Swim Club is a discount and support program, not a service plan. Weekly cleaning, chemicals, and maintenance visits are billed under a Savvy cleaning plan. Member discounts don't stack with promo codes or other active offers.",
  },
];

import { imgProps } from "@/lib/img";
import { IMG_5512_PNG as photoLifeguardChair } from "@/assets/photos";
import { IMG_5497_2_jpg as photoRedUmbrellas } from "@/assets/photos";

const PHONE_DISPLAY = "817-663-POOL";
const PHONE_HREF = "tel:+18176637665";
const EMAIL = "hi@savvyswim.com";
const SMS_PHONE = "+18176637665";


const SERVICE_MENU = [
  "Weekly Maintenance Plans",
  "Filter Clean",
  "Green Pool Recovery",
  "Algae Removal",
  "Tile & Coping Descaling",
  "Acid Washing",
  "Diagnostic Service Call",
  "Equipment Repair & Replacement",
  "Leak Detection",
  "Inspections",
  "Salt Systems",
  "Automation Service",
  "Pool Resurfacing & Remodeling",
];


const PROCESS = [
  { no: "I", title: "Walkthrough", desc: "We inspect the pool, equipment pad, and water chemistry. Then quote flat." },
  { no: "II", title: "Same tech, same day", desc: "One assigned technician on a fixed weekly cadence. No rotating crews." },
  { no: "III", title: "Photo report", desc: "Readouts and photos land in your inbox after every single visit." },
];

const Services = () => {

  const openBooking = (service?: string) =>
    goToLead("services", service ? { service } : {});

  return (
    <div className="min-h-screen overflow-x-hidden">
      <Seo
        title="Pool Cleaning, Service & Repair | Savvy Swim"
        description="Weekly pool cleaning, equipment repair, green pool recovery, salt and automation service across DFW. One team, one phone call, no contracts."
        path="/services"
      />

      {/* NAV */}
      <header className="border-b border-hairline bg-background">
        <div className="container-tight flex h-[64px] items-center justify-between gap-3 sm:h-[76px] sm:gap-4">
          <Link to="/" aria-label="Savvy Swim home" className="flex min-w-0 shrink items-center gap-3">
            <span className="whitespace-nowrap font-display text-[1.15rem] uppercase leading-none tracking-tight text-accent xs:text-[1.3rem] sm:text-[1.6rem] lg:text-[1.9rem]">
              Savvy Swim
            </span>
            <span aria-hidden="true" className="hidden whitespace-nowrap font-tech text-[9px] leading-tight text-primary/60 lg:block xl:hidden">
              On duty, so you don&rsquo;t have to be.
            </span>
          </Link>

          <nav className="hidden min-w-0 flex-1 items-center justify-center gap-4 overflow-hidden whitespace-nowrap font-tech text-primary/70 md:flex lg:gap-7">
            <Link to="/" className="shrink-0 hover:text-accent transition">Home</Link>
            <Link to="/services" className="shrink-0 text-accent">Services</Link>
            <Link to="/services" hash="membership" className="shrink-0 hover:text-accent transition">Swim Club</Link>
            <Link to="/" hash="contact" className="shrink-0 hover:text-accent transition">Contact</Link>
          </nav>
          <CallButton location="header" />
        </div>
      </header>

      <main>
        {/* HERO */}
        <section className="border-b border-hairline">
          <div className="container-tight py-12 sm:py-20">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-end">
              <div className="lg:col-span-7">
                <div className="border-t-2 border-accent pt-6">
                  <div className="font-tech text-[11px] uppercase tracking-[0.24em] text-muted-foreground mb-4">
                    What we do
                  </div>
                  <h1 className="font-display text-[2.15rem] xs:text-[2.5rem] sm:text-[4.2rem] leading-[1.02] sm:leading-[0.94] tracking-tight uppercase">
                    Cleaning, service<br />
                    &amp; <span className="text-accent">repair.</span>
                  </h1>
                  <p className="mt-5 max-w-xl text-muted-foreground text-[0.95rem] sm:text-base leading-[1.7]">
                    Weekly maintenance, equipment repair, and everything in between,
                    one team, one phone call, no contracts.
                  </p>
                  <p className="mt-4 font-serif italic text-lg sm:text-xl leading-snug text-foreground/80">
                    On duty, so you don't have to be.
                  </p>
                  <p className="mt-4 text-sm text-muted-foreground">
                    See exactly{" "}
                    <Link to="/weekly-pool-service" className="text-accent underline underline-offset-4">
                      what weekly pool service includes
                    </Link>{" "}
                    visit checklist, photo report, and the same-tech promise.
                  </p>

                  <div className="mt-8 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => openBooking()}
                  data-savvy-cta="request_quote"
                      className="btn-quote inline-flex items-center gap-2 rounded-md px-6 py-3.5 text-[13px] font-bold uppercase tracking-wide transition"
                    >
                      Start Service <ArrowRight className="h-4 w-4" />
                    </button>
                    <a
                      href={PHONE_HREF} onClick={onCallClick("service_row")}
                      className="inline-flex items-center gap-2 rounded-md border border-hairline px-6 py-3.5 text-[13px] font-bold uppercase tracking-wide hover:text-primary transition"
                    >
                      <Phone className="h-4 w-4" /> {PHONE_DISPLAY}
                    </a>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-5">
                <figure className="relative">
                  <img
                    {...imgProps(photoLifeguardChair, {
                      priority: true,
                      sizes: "(min-width: 1024px) 33vw, 100vw",
                    })}
                    alt="Savvy Swim lifeguard chair with a red striped umbrella beside a pool"
                    className="w-full aspect-[4/5] object-cover rounded-sm"
                  />
                  <figcaption className="mt-3 flex items-center justify-between font-tech text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                    <span>Plate I: On duty</span>
                    <span>DFW / TX</span>
                  </figcaption>
                </figure>
              </div>
            </div>
          </div>
        </section>

        {/* SPEC STRIP */}
        <section className="border-b border-hairline bg-primary/[0.03]">
          <div className="container-tight grid grid-cols-2 md:grid-cols-4 divide-x divide-hairline">
            {[
              ["Visits / year", "52"],
              ["Clarity target", "99.8%"],
              ["Commitment", "Month to month"],
              ["Response", "24 hrs"],
            ].map(([label, value]) => (
              <div key={label} className="px-4 py-6 first:pl-0">
                <div className="font-display text-xl sm:text-2xl md:text-3xl tracking-tight leading-tight text-balance">{value}</div>
                <div className="font-tech text-[10px] uppercase tracking-[0.2em] text-muted-foreground mt-1">
                  {label}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* SERVICES */}
        <section className="perf-section py-12 sm:py-24">
          <div className="container-tight">
            <div className="border-b border-hairline pb-5 mb-8">
              <h2 className="font-display text-[2.6rem] sm:text-[4.2rem] uppercase tracking-tight leading-[0.95]">
                What do we offer?
              </h2>
              <p className="mt-3 font-serif italic text-[1.25rem] sm:text-[1.6rem] text-muted-foreground">
                I thought you'd never ask!
              </p>
            </div>

            <div className="font-tech text-[11px] uppercase tracking-[0.24em] text-muted-foreground mb-2">
              Pool Care
            </div>

            <ul className="border-t border-hairline">
              {SERVICE_MENU.map((name, i) => (
                <li key={name} className="border-b border-hairline">
                  <button
                    type="button"
                    onClick={() => openBooking(name)}
                    data-savvy-cta="request_quote"
                    aria-label={`Book a free quote for ${name}`}
                    className="group flex w-full items-center gap-4 py-4 text-left transition hover:bg-primary/[0.04]"
                  >
                    <span className="font-tech text-[11px] tracking-[0.2em] text-muted-foreground w-8 shrink-0">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="font-display text-[1.05rem] sm:text-[1.35rem] uppercase tracking-tight leading-tight flex-1 group-hover:text-primary transition-colors">
                      {name}
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-primary" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </section>


        {/* PROCESS */}
        <section className="perf-section border-y border-hairline bg-primary/[0.03] py-12 sm:py-20">
          <div className="container-tight grid grid-cols-1 lg:grid-cols-12 gap-10">
            <div className="lg:col-span-5">
              <img
                {...imgProps(photoRedUmbrellas, { sizes: "(min-width: 1024px) 40vw, 100vw" })}
                alt="Red and white striped fringed umbrellas against a blue sky"
                className="w-full aspect-[5/4] object-cover rounded-sm"
              />
            </div>
            <div className="lg:col-span-7">
              <div className="font-tech text-[11px] uppercase tracking-[0.24em] text-muted-foreground mb-4">
                How it runs
              </div>
              <h2 className="font-display text-[1.6rem] sm:text-[2.6rem] uppercase tracking-tight leading-[1.08] mb-6 sm:mb-8">
                Three steps. Then you stop thinking about it.
              </h2>
              <div className="divide-y divide-hairline border-t border-hairline">
                {PROCESS.map((p) => (
                  <div key={p.title} className="py-5 flex gap-6">
                    <span className="font-tech text-[11px] text-accent w-8 pt-1">{p.no}</span>
                    <div>
                      <h3 className="font-semibold mb-1">{p.title}</h3>
                      <p className="text-[0.95rem] sm:text-sm text-muted-foreground leading-[1.65] max-w-lg">{p.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="perf-section py-12 sm:py-24">
          <div className="container-tight">
            <div className="border border-hairline bg-primary/[0.03] grid grid-cols-1 lg:grid-cols-12">
              <div className="lg:col-span-5 p-8 sm:p-12 lg:border-r border-hairline">
                <span className="font-tech text-[10px] uppercase tracking-[0.22em] text-accent">
                  Free quote · no pressure
                </span>
                <h2 className="mt-4 font-display text-[2rem] sm:text-[2.8rem] uppercase tracking-tight leading-[0.95] text-primary">
                  Not sure what<br />you need?
                </h2>
                <p className="mt-4 text-muted-foreground leading-relaxed max-w-sm">
                  Tell us what the pool is doing and we'll point you to the right
                  service. Most quotes come back the same day.
                </p>
                <button
                  type="button"
                  onClick={() => openBooking()}
                  data-savvy-cta="request_quote"
                  className="btn-quote mt-7 inline-flex w-full sm:w-auto items-center justify-center gap-2 px-8 py-4 text-[13px] font-bold uppercase tracking-wide transition"
                >
                  Request a quote
                </button>
              </div>

              <div className="lg:col-span-7 divide-y divide-hairline border-t lg:border-t-0 border-hairline">
                {[
                  {
                    href: PHONE_HREF,
                    icon: Phone,
                    label: "Call us",
                    hint: PHONE_DISPLAY,
                    track: onCallClick("final_cta"),
                  },
                  {
                    href: buildSmsHref(SMS_PHONE),
                    icon: MessageSquare,
                    label: "Text for a free pool quote",
                    hint: "Send a photo of the water",
                    track: () => trackContactClick("text_click", "services_final_cta_text"),
                  },
                ].map((c) => (
                  <a
                    key={c.label}
                    href={c.href}
                    onClick={c.track}
                    className="group flex items-center gap-5 px-8 sm:px-10 py-7 transition hover:bg-primary/[0.05]"
                  >
                    <c.icon className="h-5 w-5 text-accent flex-shrink-0" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] font-bold uppercase tracking-wide">{c.label}</span>
                      <span className="block text-sm text-muted-foreground truncate">{c.hint}</span>
                    </span>
                    <ArrowRight className="h-4 w-4 flex-shrink-0 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-primary" />
                  </a>
                ))}
                <button
                  type="button"
                  onClick={() => goToLead("services")}
                  className="group flex items-center gap-5 px-8 sm:px-10 py-7 transition hover:bg-primary/[0.05]"
                >
                  <Waves className="h-5 w-5 text-accent flex-shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-bold uppercase tracking-wide">Request a free pool visit</span>
                    <span className="block text-sm text-muted-foreground truncate">We inspect on site, then quote</span>
                  </span>
                  <ArrowRight className="h-4 w-4 flex-shrink-0 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-primary" />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* SAVVY SWIM CLUB */}
        <section id="membership" className="container-tight py-16">
          <div className="overflow-hidden rounded-sm border border-primary/10 shadow-3d">
            <div className="flex flex-col lg:flex-row">
              <div className="flex w-full flex-col bg-card lg:w-1/2">
                <div className="stripes-navy h-6 w-full" />
                <div className="flex flex-1 flex-col p-8 sm:p-10">
                  <span className="font-badge block text-lg leading-none tracking-[0.2em] text-red-brand">
                    Exclusivity
                  </span>
                  <h2 className="font-display mt-1 text-4xl leading-none text-navy-brand sm:text-5xl">
                    Swim Club
                  </h2>

                  <div className="mb-8 mt-6">
                    <div className="flex items-baseline gap-2">
                      <span className="font-display text-5xl text-navy-brand sm:text-6xl">$19.99</span>
                      <span className="font-editorial text-xl italic text-primary/60">per month</span>
                    </div>
                    <p className="mt-2 text-sm font-semibold uppercase tracking-tight text-primary/80">
                      Member perks on every service call · 12-month agreement, billed monthly
                    </p>
                  </div>

                  <ul className="mb-10 space-y-4 text-sm text-primary">
                    {[
                      "First service visit free (new customers)",
                      "25% off filter cleans",
                      "10% off services · 10% off parts",
                      "Priority scheduling",
                      "24/7 text support",
                    ].map((perk) => (
                      <li key={perk} className="flex items-center gap-3">
                        <span className="h-1.5 w-1.5 shrink-0 rotate-45 bg-lifeguard" />
                        <span>{perk}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    type="button"
                    onClick={() => goToSwimClub("services_membership")}
                    className="font-display mt-auto w-full bg-lifeguard py-5 text-xl uppercase tracking-[0.15em] text-primary-foreground transition-colors hover:bg-navy"
                  >
                    Join the Swim Club
                  </button>
                  <p className="mt-3 text-center text-xs text-muted-foreground">
                    12-month agreement · Billed monthly at $19.99
                  </p>
                </div>
              </div>

              <div className="flex w-full flex-col bg-navy-brand p-8 sm:p-10 lg:w-1/2">
                <h3 className="font-editorial text-3xl normal-case italic text-canvas">
                  Membership details
                </h3>
                <p className="mt-2 text-xs text-canvas/60">
                  Everything included with your $19.99/month Savvy Swim Club.
                </p>
                <Accordion type="single" collapsible className="mt-6">
                  {MEMBERSHIP_FAQ.map((item) => (
                    <AccordionItem key={item.q} value={item.q} className="border-b border-canvas/20">
                      <AccordionTrigger className="text-left text-sm font-semibold uppercase tracking-wide text-canvas hover:no-underline [&>svg]:text-lifeguard">
                        {item.q}
                      </AccordionTrigger>
                      <AccordionContent className="text-xs leading-relaxed text-canvas/70">
                        {item.a}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            </div>
          </div>
        </section>

        <section className="container-tight py-16">
          <ServiceAreaMap />
        </section>



      </main>

      <footer className="border-t border-hairline py-10">
        <div className="container-tight flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Waves className="h-4 w-4 text-amber-brand" />
            <span>© {new Date().getFullYear()} Savvy Swim · A Santana &amp; Rivera Company. All rights reserved.</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            <a href={`mailto:${EMAIL}`} className="hover:text-foreground transition">{EMAIL}</a>
            <a href={PHONE_HREF} onClick={onCallClick("footer")} className="hover:text-foreground transition">{PHONE_DISPLAY}</a>
            <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" aria-label="Savvy Swim on Instagram" className="inline-flex items-center gap-1.5 hover:text-foreground transition"><Instagram className="h-4 w-4" />Instagram</a>
            <Link to="/pool-cleaning-frisco-tx" className="hover:text-foreground transition">Pool Cleaning Frisco TX</Link>
            <Link to="/privacy-policy" className="hover:text-foreground transition">Privacy Policy</Link>
            <Link to="/terms-and-conditions" className="hover:text-foreground transition">Terms &amp; Conditions</Link>
          </div>
        </div>
      </footer>

      <StickyCallBar />
      </div>
  );
};

export default Services;
