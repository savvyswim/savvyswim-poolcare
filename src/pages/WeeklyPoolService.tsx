import { Link } from "@/lib/router-compat";
import {
  Phone,
  MapPin,
  CheckCircle2,
  Camera,
  UserCheck,
  FlaskConical,
} from "lucide-react";
import { trackContactClick } from "@/lib/contactTracking";
import { CallButton, StickyCallBar, onCallClick } from "@/components/CallButton";
import { goToLead } from "@/lib/site-analytics";

import {
  IMG_5504_2_JPG as photoRivieraLoungers,
  IMG_5512_PNG as photoSavvyRings,
  pool_water_hd_jpg as photoWater,
} from "@/assets/photos";

const PHONE_DISPLAY = "817-663-POOL";
const PHONE_HREF = "tel:+18176637665";

export const WEEKLY_VISIT_STEPS = [
  {
    no: "01",
    title: "Water test on arrival",
    body:
      "Free and total chlorine, pH, total alkalinity, calcium hardness, cyanuric acid, and salt on salt pools. Readings are logged before anything goes in the water.",
  },
  {
    no: "02",
    title: "Chemistry balanced",
    body:
      "Chlorine, acid, alkalinity, stabilizer, and salt dosed to target. All standard chemicals are included in the monthly price — no per-visit chemical bill.",
  },
  {
    no: "03",
    title: "Skim, brush, vacuum",
    body:
      "Surface skimmed, walls, steps and tile line brushed, and the floor vacuumed as needed so debris does not sit and stain the plaster.",
  },
  {
    no: "04",
    title: "Baskets and pump strainer",
    body:
      "Skimmer baskets, pump basket, and cleaner bag emptied every visit. Restricted flow is the number one cause of dead pumps in North Texas summers.",
  },
  {
    no: "05",
    title: "Filter and equipment check",
    body:
      "Filter pressure recorded, backwash or clean when it climbs, plus a look at the pump, heater, salt cell, valves, and automation for leaks or wear.",
  },
  {
    no: "06",
    title: "Photo report before we leave",
    body:
      "Photos of the finished pool and equipment pad, every chemical reading, what was added, and any issue we spotted — sent to your phone from the driveway.",
  },
];

export const WEEKLY_FAQ = [
  {
    q: "What does weekly pool service include?",
    a: "Every weekly visit includes a full water test, balanced chemistry with chemicals included, skimming, brushing, vacuuming as needed, emptying skimmer and pump baskets, a filter pressure check, an equipment inspection, and a photo report with all readings sent to your phone before we leave.",
  },
  {
    q: "How much is weekly pool service near me in DFW?",
    a: "Weekly service starts at $129.99 per month with chemicals included. Pool size, spa, water feature, and current condition set the final number, and we quote flat after a free walkthrough so the price does not change week to week.",
  },
  {
    q: "Do I get the same pool technician every week?",
    a: "Yes. Each pool is assigned to one technician on a fixed route day, so the same person knows your equipment, gate code, and dog. If they are out, the covering tech gets your full pool history and photo log first.",
  },
  {
    q: "Do I need to be home for a weekly visit?",
    a: "No. We work around gate codes, locked side yards, and dogs, and the photo report is your proof of the visit. On duty, so you don't have to be.",
  },
  {
    q: "How often should a pool be cleaned in Texas?",
    a: "Weekly, year round. DFW heat, hard water, and pollen mean chlorine burns off and calcium builds fast in summer, and winter pools still need chemistry and equipment checks to avoid algae blooms and freeze damage.",
  },
  {
    q: "What if the pool isn't clear after a visit?",
    a: "We come back free, same day, if it is our fault. If a storm, landscaping crew, or third party caused it, you still get one complimentary return visit.",
  },
];

export default function WeeklyPoolService() {



  return (
    <div className="min-h-screen overflow-x-hidden">
      <header className="border-b border-hairline bg-background">
        <div className="container-tight flex h-[64px] items-center justify-between gap-3 sm:h-[76px] sm:gap-4">
          <Link to="/" aria-label="Savvy Swim — home" className="flex min-w-0 shrink items-center gap-3">
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
          <CallButton location="weekly_hub_header" />
        </div>
      </header>

      <main>
        {/* HERO */}
        <section className="border-b border-hairline">
          <div className="container-tight py-16 sm:py-20">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-end">
              <div className="lg:col-span-7">
                <div className="border-t-2 border-accent pt-6">
                  <div className="font-tech text-[11px] uppercase tracking-[0.24em] text-muted-foreground mb-4 inline-flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5" /> Dallas–Fort Worth · 12 cities
                  </div>
                  <h1 className="font-display uppercase leading-[0.94] tracking-tight" style={{ fontSize: "clamp(2.2rem, 5.4vw, 4.2rem)" }}>
                    Weekly pool service
                    <br />
                    <span className="text-accent">near me, DFW.</span>
                  </h1>
                  <p className="mt-6 max-w-xl text-muted-foreground text-base leading-relaxed">
                    One technician, one fixed route day, and a photo report with every chemistry
                    reading before we leave your driveway. Chemicals included, flat monthly price,
                    no contract. Weekly service starts at $129.99 / month.
                  </p>
                  <p className="mt-4 font-serif italic text-xl text-foreground/80">
                    On duty, so you don't have to be.
                  </p>
                  <div className="mt-8 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => goToLead("weekly_hub_hero")}
                      data-savvy-cta="request_quote"
                      className="btn-quote inline-flex items-center gap-2 rounded-md px-6 py-3.5 text-[13px] font-bold uppercase tracking-wide transition"
                    >
                      Book free inspection
                    </button>
                    <button
                      type="button"
                      onClick={() => goToLead("weekly_hub_hero_alt")}
                      data-savvy-cta="request_quote"
                      className="inline-flex items-center gap-2 rounded-md border border-hairline px-6 py-3.5 text-[13px] font-bold uppercase tracking-wide hover:text-primary transition"
                    >
                      Free inspection
                    </button>
                    <a
                      href={PHONE_HREF}
                      onClick={onCallClick("weekly_hub_hero")}
                      className="inline-flex items-center gap-2 rounded-md border border-hairline px-6 py-3.5 text-[13px] font-bold uppercase tracking-wide hover:text-primary transition"
                    >
                      <Phone className="h-4 w-4" /> {PHONE_DISPLAY}
                    </a>
                  </div>
                </div>
              </div>
              <div className="lg:col-span-5">
                <img
                  src={photoWater.url}
                  alt="Clear, balanced pool water after a weekly Savvy Swim service visit in Dallas–Fort Worth"
                  loading="eager"
                  className="w-full h-[240px] sm:h-[320px] object-cover rounded-sm border border-hairline"
                />
              </div>
            </div>
          </div>
        </section>

        {/* WHAT A WEEKLY VISIT INCLUDES */}
        <section className="perf-section border-b border-hairline py-16 sm:py-24">
          <div className="container-tight">
            <div className="font-tech text-[11px] uppercase tracking-[0.24em] text-muted-foreground mb-3 inline-flex items-center gap-2">
              <FlaskConical className="h-3.5 w-3.5" /> Every visit, every week
            </div>
            <h2 className="font-display text-[1.9rem] sm:text-[2.6rem] uppercase tracking-tight leading-none">
              What weekly pool service includes
            </h2>
            <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-hairline border border-hairline">
              {WEEKLY_VISIT_STEPS.map((s) => (
                <div key={s.no} className="bg-background p-6 sm:p-8">
                  <div className="font-tech text-[11px] tracking-[0.2em] text-accent">{s.no}</div>
                  <h3 className="mt-3 font-display text-[1.15rem] uppercase tracking-tight leading-tight">
                    {s.title}
                  </h3>
                  <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* PHOTO REPORT + SAME TECH */}
        <section className="perf-section border-b border-hairline py-16 sm:py-24">
          <div className="container-tight grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-start">
            <div>
              <div className="font-tech text-[11px] uppercase tracking-[0.24em] text-muted-foreground mb-3 inline-flex items-center gap-2">
                <Camera className="h-3.5 w-3.5" /> The photo report
              </div>
              <h2 className="font-display text-[1.7rem] sm:text-[2.2rem] uppercase tracking-tight leading-none">
                Proof of every visit, on your phone
              </h2>
              <p className="mt-4 text-muted-foreground leading-relaxed">
                You should never have to guess whether the pool guy showed up. Before the tech
                leaves, the report is sent from the driveway.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  "Photos of the finished pool and the equipment pad",
                  "All chemistry readings, with anything out of range flagged",
                  "Exactly which chemicals were added and how much",
                  "Filter pressure and any equipment issue we spotted",
                  "Timestamp and the name of the tech who serviced the pool",
                ].map((t) => (
                  <li key={t} className="flex gap-3 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">{t}</span>
                  </li>
                ))}
              </ul>
              <img
                src={photoSavvyRings.url}
                alt="Savvy Swim rings floating in a clean, freshly serviced backyard pool"
                loading="lazy"
                className="mt-8 w-full h-[220px] object-cover rounded-sm border border-hairline"
              />
            </div>
            <div>
              <div className="font-tech text-[11px] uppercase tracking-[0.24em] text-muted-foreground mb-3 inline-flex items-center gap-2">
                <UserCheck className="h-3.5 w-3.5" /> The same-tech promise
              </div>
              <h2 className="font-display text-[1.7rem] sm:text-[2.2rem] uppercase tracking-tight leading-none">
                One technician. One route day.
              </h2>
              <p className="mt-4 text-muted-foreground leading-relaxed">
                Your pool is assigned to a single technician on a fixed weekly day, not a rotating
                crew. They learn your plaster, your salt cell, your gate code, and your dog — so
                small problems get caught before they become a repair.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  "Same tech, same day of the week, all season",
                  "On-my-way text before arrival",
                  "Full pool history handed over if your tech is ever out",
                  "Gate codes, dog names, and access notes kept on the account",
                  "Skipped for weather? The visit is made up, not billed",
                ].map((t) => (
                  <li key={t} className="flex gap-3 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">{t}</span>
                  </li>
                ))}
              </ul>
              <img
                src={photoRivieraLoungers.url}
                alt="Striped loungers beside a weekly-serviced pool in Dallas–Fort Worth"
                loading="lazy"
                className="mt-8 w-full h-[220px] object-cover rounded-sm border border-hairline"
              />
            </div>
          </div>
        </section>

        {/* PRICING */}
        <section className="perf-section border-b border-hairline py-16 sm:py-24">
          <div className="container-tight">
            <h2 className="font-display text-[1.9rem] sm:text-[2.6rem] uppercase tracking-tight leading-none">
              Starting price
            </h2>
            <div className="mt-8 border border-hairline rounded-sm p-8 sm:p-10 max-w-2xl">
              <div className="font-display text-[2.6rem] sm:text-[3.4rem] leading-none text-accent">
                $129.99<span className="text-[1.1rem] text-muted-foreground"> / month</span>
              </div>
              <p className="mt-4 text-muted-foreground leading-relaxed">
                Weekly service, chemicals included, no contract. Pool size, spa, water features and
                current condition set the final number — you get a flat monthly quote after a free
                walkthrough, and it does not change week to week.
              </p>
              <p className="mt-4 text-sm text-muted-foreground">
                Optional: the Swim Club membership adds $19.99 / month on top of your service price
                for the 24/7 service line and member benefits.
              </p>
            </div>
          </div>
        </section>


        {/* FAQ */}
        <section className="perf-section border-b border-hairline py-16 sm:py-24">
          <div className="container-tight">
            <h2 className="font-display text-[1.9rem] sm:text-[2.6rem] uppercase tracking-tight leading-none">
              Weekly service questions
            </h2>
            <div className="mt-8 divide-y divide-hairline border-t border-hairline max-w-3xl">
              {WEEKLY_FAQ.map((f) => (
                <div key={f.q} className="py-6">
                  <h3 className="font-display text-[1.1rem] uppercase tracking-tight">{f.q}</h3>
                  <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{f.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="perf-section py-16 sm:py-24">
          <div className="container-tight">
            <div className="border border-hairline rounded-sm p-8 sm:p-12 flex flex-col sm:flex-row sm:items-center gap-8 justify-between">
              <div>
                <h2 className="font-display text-[1.8rem] sm:text-[2.4rem] uppercase tracking-tight leading-none">
                  Start weekly service
                </h2>
                <p className="mt-3 text-muted-foreground max-w-md">
                  Free walkthrough, flat monthly quote, and your first visit on the next route day
                  in your city.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => goToLead("weekly_hub_final")}
                      data-savvy-cta="request_quote"
                  className="btn-quote inline-flex items-center gap-2 rounded-md px-6 py-3.5 text-[13px] font-bold uppercase tracking-wide transition"
                >
                  Book free inspection
                </button>
                <a
                  href={PHONE_HREF}
                  onClick={onCallClick("weekly_hub_cta")}
                  className="inline-flex items-center gap-2 rounded-md border border-hairline px-6 py-3.5 text-[13px] font-bold uppercase tracking-wide hover:text-primary transition"
                >
                  <Phone className="h-4 w-4" /> {PHONE_DISPLAY}
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <StickyCallBar />
      </div>
  );
}
