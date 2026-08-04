import { useEffect, useRef, useState } from "react";
import {
  Mail,
  Phone,
  Waves,
  Droplets,
  Sparkles,
  Sun,
  Wrench,
  Cpu,
  ArrowRight,
  CheckCircle2,
  Star,
  MapPin,
  ShieldCheck,
  CalendarCheck,
} from "lucide-react";
import photoLifeguardChair from "@/assets/IMG_5512.PNG.asset.json";
import photoNavyCabana from "@/assets/IMG_5507-2.JPG.asset.json";
import photoRivieraLoungers from "@/assets/IMG_5508-2.JPG.asset.json";
import photoSavvyRings from "@/assets/IMG_5518.PNG.asset.json";
import photoRescueTube from "@/assets/IMG_5503.jpg.asset.json";
import photoSavvyLetters from "@/assets/IMG_5502.PNG.asset.json";

const poolDesign = photoNavyCabana.url;
const poolNight = photoRivieraLoungers.url;

import { BookingDialog } from "@/components/BookingDialog";
import Seo from "@/components/Seo";
import { SmoothLoopVideo } from "@/components/SmoothLoopVideo";
import { OrderDialog, type OrderItem } from "@/components/OrderDialog";
import { SubscribeDialog } from "@/components/SubscribeDialog";
import { MembershipDialog } from "@/components/MembershipDialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const MEMBERSHIP_FAQ = [
  {
    q: "What is the Savvy Swim Club?",
    a: "It's our $19.99/month membership for pool owners in DFW. Members get discounted pricing on parts and labor, a half-price filter clean, priority scheduling, and 24/7 text support with our techs. It works alongside any cleaning plan — or on its own if you maintain the pool yourself.",
  },
  {
    q: "What do members get, exactly?",
    a: "One filter clean at 50% off (one time per membership), 5% off all parts we supply, 7% off installation and repair labor, priority booking on the service calendar, and unlimited 24/7 text support for water chemistry and equipment questions.",
  },
  {
    q: "How does billing work?",
    a: "Membership is $19.99 per month, charged automatically to the card on file on the same day each month. The first charge happens the day you join, and your perks are active immediately. Service visits, repairs, and parts are invoiced separately — the membership fee never covers the work itself.",
  },
  {
    q: "How long is the commitment?",
    a: "The Swim Club runs on a 12-month agreement billed monthly. After the first 12 months it continues month to month, so you can stay on at the same rate or stop any time with no further obligation.",
  },
  {
    q: "How do I cancel?",
    a: "Text or email us and we'll cancel your renewal — no phone maze, no cancellation fee after the initial 12-month term. During the term, cancellation ends your monthly perks and any remaining months of the agreement are due; if your situation changes, like selling the home, let us know and we'll work with you.",
  },
  {
    q: "How do I use my member discounts?",
    a: "Just book as usual — we apply member pricing automatically when we build your invoice. Parts get 5% off the parts line and labor gets 7% off the labor line. Mention the filter clean when you schedule so we tag it as your 50% benefit.",
  },
  {
    q: "What is 24/7 text support?",
    a: "Text your service number any time with a photo or a question. Members get answers on water chemistry, equipment alarms, and troubleshooting outside normal business hours — often before we ever need to roll a truck.",
  },
  {
    q: "What isn't included?",
    a: "The Swim Club is a discount and support program, not a service plan. Weekly cleaning, chemicals, and maintenance visits are billed under a Savvy cleaning plan. Member discounts don't stack with promo codes or other active offers.",
  },
];
import { supabase } from "@/integrations/supabase/client";


const EMAIL = "hi@savagepools.us";
const PHONE_DISPLAY = "(469) 213-8087";
const PHONE_HREF = "tel:+14692138087";

const TICKER_ITEMS: { label: string; live?: boolean }[] = [
  { label: "Est. Texas — Pool Care Systems" },
  { label: "Jump in, the water's warm.", live: true },
  { label: "Now serving — Dallas" },
  { label: "Plano" },
  { label: "Frisco" },
  { label: "McKinney" },
  { label: "Allen" },
  { label: "Richardson" },
  { label: "Highland Park" },
  { label: "University Park" },
  { label: "Garland" },
  { label: "Irving" },
  { label: "Rockwall" },
  { label: "Prosper" },
  { label: "Lat 32.7767 / Lon −96.7970" },
  { label: "Rev. 04" },
];


const REVIEWS_ROW_1 = [
  { q: "Our green pool was swimmable in four days. I still can't believe the before and after.", a: "Megan R.", c: "Plano, TX" },
  { q: "Tech showed up on time, replaced the pump motor same day, and texted me photos of the work.", a: "Daniel K.", c: "Frisco, TX" },
  { q: "Weekly service is flawless. I haven't touched a chemical in two years and the water looks like glass.", a: "Priya S.", c: "Southlake, TX" },
  { q: "They diagnosed a leak two other companies missed. Repair was clean and priced fair.", a: "Chris B.", c: "Fort Worth, TX" },
  { q: "Filter cleans, salt cell service, everything on schedule. I never think about my pool anymore.", a: "Alyssa M.", c: "Highland Park, TX" },
  { q: "Photo report after every visit. I always know exactly what was done.", a: "Marcus T.", c: "Arlington, TX" },
];

const REVIEWS_ROW_2 = [
  { q: "Heater stopped working mid-winter, they had it running again in one visit.", a: "Jenna W.", c: "McKinney, TX" },
  { q: "Automation on my phone — heater, lights, spa. They set it all up and walked me through it.", a: "Ravi P.", c: "Irving, TX" },
  { q: "Third company we tried, first one that actually kept the chemistry stable all summer.", a: "Tyler G.", c: "Grapevine, TX" },
  { q: "Warranty claim on a pump was handled in 48 hours, no argument. That's rare.", a: "Sharon L.", c: "Rockwall, TX" },
  { q: "Tile line and steps look brand new after their surface care visit.", a: "Omar H.", c: "Allen, TX" },
  { q: "Swim Club membership pays for itself with the filter clean discount alone.", a: "Brittany N.", c: "Keller, TX" },
];


type CleaningPlan = {
  id: string;
  name: string;
  blurb: string;
  price: string;
  cadence: string;
  items: string[];
  featured: boolean;
};

const CLEANING_PLANS: CleaningPlan[] = [
  {
    id: "fallback-essential",
    featured: false,
    name: "Essential Clean",
    price: "$149",
    cadence: "/ month",
    blurb: "Bi-weekly visits for low-traffic backyards.",
    items: ["2 visits per month", "Skim, brush & vacuum", "Basket & skimmer cleanout", "Water chemistry balance", "Digital service report"],
  },
  {
    id: "fallback-annual",
    name: "Savvy Annual",
    price: "Custom quote",
    cadence: "billed monthly",
    blurb: "Annual agreement with 4 complimentary cleanings included.",
    items: ["4 complimentary cleanings per year", "Weekly service visits", "Full chemical package included", "Filter pressure & equipment checks", "Photo report after every clean", "Priority scheduling"],
    featured: true,
  },

  {
    id: "fallback-total",
    featured: false,
    name: "Total Care",
    price: "$349",
    cadence: "/ month",
    blurb: "Hands-off ownership, pool always guest-ready.",
    items: ["4 visits + on-call touch-ups", "Chemicals, salt & tabs included", "Quarterly filter deep clean", "Free minor equipment repairs", "Seasonal open/close service", "24/7 text support"],
  },
];


const Index = () => {
  const [scrolled, setScrolled] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookingService, setBookingService] = useState<string | undefined>(undefined);
  const [subscribeOpen, setSubscribeOpen] = useState(false);
  const [membershipOpen, setMembershipOpen] = useState(false);
  const [subscribePlan, setSubscribePlan] = useState<string | undefined>(undefined);
  const [orderItem, setOrderItem] = useState<OrderItem | null>(null);
  const [orderOpen, setOrderOpen] = useState(false);
  const openOrder = (item: OrderItem) => {
    setOrderItem(item);
    setOrderOpen(true);
  };
  const openBooking = (service?: string) => {
    setBookingService(service);
    setBookingOpen(true);
  };

  const [cleaningPlans, setCleaningPlans] = useState<CleaningPlan[]>(CLEANING_PLANS);


  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("cleaning_plans")
        .select("id,name,blurb,price,cadence,items,featured")
        .eq("is_active", true)
        .order("display_order");
      if (active && data && data.length) setCleaningPlans(data as CleaningPlan[]);
    })();
    return () => {
      active = false;
    };
  }, []);




  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Parallax for hero
  useEffect(() => {
    const onScroll = () => {
      if (!heroRef.current) return;
      const y = window.scrollY;
      heroRef.current.style.transform = `translate3d(0, ${y * 0.25}px, 0) scale(${1 + y * 0.0004})`;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen overflow-x-hidden">
      <Seo
        title="Savvy Swim — Pool Cleaning, Service & Repair in Texas"
        description="Weekly pool cleaning, maintenance, equipment service and repair across DFW and Texas. Free quote from Savvy Swim, a Santana & Rivera company."
        path="/"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "Savvy Swim",
          url: "https://savvyswim.com",
        }}
      />
      {/* NAV */}
      <header className="fixed top-0 left-0 right-0 z-50">
        {/* Utility bar */}
        <div className="topbar hidden md:block text-[13px]">
          <div className="container-tight flex h-9 items-center justify-between gap-6">
            <a href="#cleaning" className="font-semibold hover:opacity-80 transition">
              Weekly pool cleaning, service &amp; repair — Get a quote →
            </a>
            <div className="flex items-center gap-6">
              <a href="#cleaning" className="hover:opacity-80 transition">Pool Cleaning</a>
              <a href="/services" className="hover:opacity-80 transition">Services</a>
              <a href="/privacy-policy" className="hover:opacity-80 transition">Warranty &amp; Privacy</a>
              <span className="font-semibold">Service: {PHONE_DISPLAY}</span>
            </div>
          </div>
        </div>

        <div
          className={`bg-background border-b border-hairline transition-shadow duration-300 ${
            scrolled ? "shadow-card" : ""
          }`}
        >
          <div className="container-tight flex h-[72px] items-center justify-between">
            <a href="#" className="flex items-center gap-2.5">
              <div className="relative h-10 w-10 border border-primary/25 grid place-items-center">
                <Waves className="h-4 w-4 text-accent" />
              </div>
              <span className="tracking-tight text-base leading-tight flex flex-col">
                <span className="font-display text-[19px] tracking-[0.02em]">SAVVY SWIM</span>
                <span className="font-tech text-[8.5px] text-primary/45">A Santana &amp; Rivera Company</span>
              </span>
            </a>
            <nav className="hidden xl:flex items-center gap-7 whitespace-nowrap font-tech text-primary/70">
              <a href="#cleaning" className="hover:text-accent transition">Pool Cleaning</a>
              <a href="/services" className="hover:text-accent transition">Service &amp; Repair</a>
              <a href="#portfolio" className="hover:text-accent transition">Our Work</a>
              <a href="#about" className="hover:text-accent transition">About Us</a>
              <a href="#contact" className="hover:text-accent transition">Contact</a>
            </nav>

            <div className="flex items-center gap-2">
              <a
                href={PHONE_HREF}
                className="hidden sm:inline-flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm font-semibold text-foreground hover:text-primary transition"
              >
                <Phone className="h-4 w-4 text-amber-brand" /> {PHONE_DISPLAY}
              </a>
              <button
                type="button"
                onClick={() => openBooking()}
                className="btn-quote inline-flex items-center gap-2 whitespace-nowrap rounded-md px-5 py-3 text-[13px] font-bold uppercase tracking-wide transition"
              >
                Request Quote
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* HERO — vintage riviera meets instrumentation */}
      <section className="relative bg-canvas pt-32 sm:pt-36">
        <div className="absolute inset-0 tech-grid pointer-events-none" aria-hidden />

        {/* instrumentation strip — live scrolling ticker */}
        <div className="relative tech-rule overflow-hidden">
          <div className="marquee-pause marquee-fade py-3">
            <div className="flex w-max animate-marquee-slow">
              {[0, 1].map((dup) => (
                <div key={dup} className="flex items-center whitespace-nowrap" aria-hidden={dup === 1}>
                  {TICKER_ITEMS.map((item, i) => (
                    <span key={`${dup}-${i}`} className="flex items-center">
                      <span className="tech-label flex items-center gap-2">
                        {item.live && (
                          <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent animate-blip" />
                        )}
                        <span className={item.live ? "text-accent" : undefined}>{item.label}</span>
                      </span>
                      <span className="mx-6 text-primary/20">/</span>
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>


        <div className="relative tech-rule">
          <div className="container-tight grid gap-x-12 gap-y-14 py-16 sm:py-24 lg:grid-cols-12 lg:items-center">
            <div className="lg:col-span-7">
              <p className="tech-label mb-8">Fig. 01 — Weekly Service Program</p>
              <h1 className="type-mega text-primary max-w-[16ch]">
                Crystal-clear
                <span className="block type-mega-alt text-accent">water,</span>
                <span className="block">engineered weekly.</span>
              </h1>

              <div className="mt-9 inline-flex max-w-full flex-col border-y-2 border-accent/70 py-4 pr-2">
                <span className="tech-label flex items-center gap-2 text-accent">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent animate-blip" />
                  On duty — 24/7
                </span>
                <p className="mt-2 font-display uppercase leading-[0.95] tracking-tight text-primary text-[clamp(1.7rem,4.2vw,3.1rem)]">
                  On duty, so you
                  <span className="block text-accent">don&apos;t have to be.</span>
                </p>
              </div>


              <div className="mt-10 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => openBooking("Weekly Service & Maintenance")}
                  className="font-tech inline-flex items-center gap-2 bg-primary px-7 py-4 text-primary-foreground transition-colors hover:bg-accent"
                >
                  <CalendarCheck className="h-4 w-4" /> Start Service
                </button>
                <a
                  href={PHONE_HREF}
                  className="font-tech inline-flex items-center gap-2 border border-primary/20 px-7 py-4 text-primary transition-colors hover:border-primary"
                >
                  <Phone className="h-4 w-4" /> {PHONE_DISPLAY}
                </a>
              </div>
            </div>

            {/* Photo plate — vintage spec card */}
            <div className="lg:col-span-5">
              <figure className="relative border border-primary/15 bg-canvas p-3 shadow-card">
                <div className="flex items-start justify-between px-1 pb-3">
                  <span className="tech-label">Plate I — Station 04</span>
                  <span className="tech-readout text-[11px] text-primary/40">SS-01</span>
                </div>
                <div className="relative overflow-hidden border border-primary/10">
                  <img
                    src={photoLifeguardChair.url}
                    alt="Savvy Swim lifeguard chair and red cabana umbrella beside a serviced pool"
                    loading="eager"
                    className="aspect-[4/5] w-full object-cover"
                  />
                  <figcaption className="absolute bottom-0 left-0 bg-accent px-3 py-1.5 font-tech text-[10px] uppercase tracking-[0.2em] text-primary-foreground">
                    On duty
                  </figcaption>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-4 border-t border-primary/10 px-1 pt-3">
                  <div>
                    <p className="tech-label">Clarity</p>
                    <p className="tech-readout text-sm text-primary">99.8%</p>
                  </div>
                  <div className="text-right">
                    <p className="tech-label">Cadence</p>
                    <p className="tech-readout text-sm text-accent">Weekly</p>
                  </div>
                </div>
              </figure>

              <div className="mt-3 border border-primary/15 bg-primary text-primary-foreground">
                <div className="flex items-center justify-between border-b border-primary-foreground/15 px-4 py-3">
                  <span className="font-tech text-[10px] uppercase tracking-[0.22em] text-primary-foreground/60">
                    Service Guarantee
                  </span>
                  <span className="flex items-center gap-2 font-tech text-[10px] uppercase tracking-[0.22em] text-accent">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent animate-blip" />
                    Active
                  </span>
                </div>
                <div className="grid grid-cols-3 divide-x divide-primary-foreground/15">
                  {[
                    { k: "52", v: "Visits / yr" },
                    { k: "24h", v: "Repair reply" },
                    { k: "0", v: "Contracts" },
                  ].map((s) => (
                    <div key={s.v} className="px-4 py-4">
                      <div className="font-display text-2xl leading-none">{s.k}</div>
                      <div className="mt-1.5 font-tech text-[10px] uppercase tracking-[0.18em] text-primary-foreground/60">
                        {s.v}
                      </div>
                    </div>
                  ))}
                </div>
                <p className="border-t border-primary-foreground/15 px-4 py-3 text-[13px] leading-relaxed text-primary-foreground/75">
                  Water not clear after a visit? We come back free.
                </p>
              </div>

            </div>
          </div>
        </div>


        {/* Spec sheet grid */}
        <div className="relative tech-rule">
          <div className="container-tight grid gap-x-10 gap-y-12 py-16 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <p className="tech-label">§ 01 — Method</p>
              <p className="mt-6 max-w-xl text-[17px] leading-relaxed text-primary/90">
                Licensed technicians, calibrated chemistry, and monitored equipment. Every visit is logged,
                photographed, and time-stamped — classic pool craft, run like a control room.
              </p>
              <p className="mt-10 tech-label">§ 02 — Scope</p>
              <p className="mt-6 max-w-xl text-[17px] leading-relaxed text-primary/90">
                Weekly maintenance is the baseline. From there: equipment repair, pump and filter service,
                salt and automation tuning, and green-pool recovery. No contracts.
              </p>
            </div>

            {/* Readouts */}
            <div className="lg:col-span-3">
              <p className="tech-label">Water Readout</p>
              <dl className="mt-6 divide-y divide-primary/10 border-y border-primary/10">
                {[
                  ["pH", "7.40"],
                  ["Free Cl", "3.0 ppm"],
                  ["Alkalinity", "100 ppm"],
                  ["Calcium", "300 ppm"],
                  ["Cyanuric", "50 ppm"],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between py-2.5">
                    <dt className="font-tech text-primary/50">{k}</dt>
                    <dd className="tech-readout text-sm text-primary">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="lg:col-span-3 lg:col-start-10">
              <p className="tech-label">Index of Services</p>
              <ul className="mt-6 space-y-2.5 text-[15px] text-primary">
                {[
                  "Weekly Pool Cleaning",
                  "Chemical Balancing",
                  "Filter & Pump Service",
                  "Equipment Repair",
                  "Green Pool Recovery",
                  "Tile & Deck Care",
                  "Salt System Service",
                  "Leak & Plumbing Repair",
                  "Seasonal Openings",
                ].map((s, i) => (
                  <li key={s} className="flex gap-3">
                    <span className="tech-readout text-[11px] pt-1 text-primary/35">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <a href="#services" className="hover:text-accent transition-colors">{s}</a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="relative tech-rule">
          <div className="container-tight grid max-w-4xl grid-cols-3 gap-6 py-12">
            {[
              { k: "1,200+", v: "Pools serviced" },
              { k: "4.9★", v: "Avg client rating" },
              { k: "52", v: "Visits per year" },
            ].map((s) => (
              <div key={s.v}>
                <div className="font-editorial italic text-primary text-4xl sm:text-5xl">{s.k}</div>
                <div className="mt-2 tech-label">{s.v}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Side quote tab */}
      <button
        type="button"
        onClick={() => openBooking()}
        className="btn-quote hidden lg:flex fixed right-0 top-1/2 z-40 -translate-y-1/2 items-center px-3 py-6 text-[11px] font-bold uppercase tracking-[0.22em] shadow-cta"
        style={{ writingMode: "vertical-rl" }}
      >
        Request a Quote
      </button>

      {/* MARQUEE — telemetry ticker */}
      <section className="border-y border-primary/15 bg-primary text-primary-foreground py-4 overflow-hidden">
        <div className="flex animate-marquee gap-10 whitespace-nowrap font-tech">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="flex gap-10 items-center shrink-0 opacity-90">
              <span>Weekly Cleaning</span><span className="text-accent">/</span>
              <span>pH 7.4</span><span className="text-accent">/</span>
              <span>Chemical Balancing</span><span className="text-accent">/</span>
              <span>Filter Cleans</span><span className="text-accent">/</span>
              <span>Pump Repair</span><span className="text-accent">/</span>
              <span>ORP 700mV</span><span className="text-accent">/</span>
              <span>Heater Service</span><span className="text-accent">/</span>
              <span>Green Pool Recovery</span><span className="text-accent">/</span>
              <span>Salt Systems</span><span className="text-accent">/</span>
            </div>
          ))}
        </div>
      </section>





      {/* PROCESS — how service works */}
      <section className="py-24 sm:py-32 relative bg-ink/40 border-y border-hairline overflow-hidden">
        <div className="absolute inset-0 water-caustics opacity-40" />
        <div className="container-tight relative">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="relative tilt-card">
              <div className="absolute -inset-6 bg-gradient-radial opacity-70 blur-3xl" />
              <div className="relative rounded-sm overflow-hidden shadow-3d border border-hairline">
                <img
                  src={poolDesign}
                  alt="Sparkling clean backyard pool maintained weekly by Savvy Swim"
                  width={1920}
                  height={1280}
                  loading="lazy"
                  className="w-full h-auto"
                />
                <div className="absolute top-4 left-4 inline-flex items-center gap-2 rounded-full glass px-3 py-1.5 text-[10px] uppercase tracking-[0.2em]">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-brand animate-pulse-glow" />
                  Serviced weekly
                </div>

              </div>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-brand mb-3">
                How it goes
              </div>
              <h2 className="text-[2rem] sm:text-[2.6rem] leading-[1.12] font-semibold tracking-tight mb-6">
                Clean water,
                <span className="text-gradient-amber"> handled on a schedule.</span>
              </h2>
              <p className="text-muted-foreground text-lg leading-relaxed mb-8">
                Every Savvy Swim account starts with a free water test and equipment
                check — then a certified tech shows up the same day each week and
                sends you a photo report before they leave.
              </p>
              <ol className="space-y-5">
                {[
                  { n: "01", t: "Free water test & walk-through", d: "We test chemistry, inspect equipment, and quote on the spot." },
                  { n: "02", t: "Pick your plan", d: "Weekly, bi-weekly, or one-time cleanup — no contracts." },
                  { n: "03", t: "Same tech, same day", d: "Skim, brush, vacuum, balance, and filter check every visit." },
                  { n: "04", t: "Photo report after every visit", d: "Chemistry readings and photos texted or emailed to you." },
                  { n: "05", t: "Repairs when you need them", d: "Pumps, filters, heaters, and salt systems fixed fast." },
                ].map((p) => (
                  <li key={p.n} className="flex gap-4">
                    <div className="text-amber-brand font-mono font-bold text-sm pt-1">{p.n}</div>
                    <div>
                      <div className="font-semibold">{p.t}</div>
                      <div className="text-sm text-muted-foreground">{p.d}</div>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </section>

      {/* CLEANING PLANS */}
      <section id="cleaning" className="py-24 sm:py-32 relative bg-ink/40 border-y border-hairline">
        <div className="container-tight">
          <div className="max-w-2xl mb-12">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-brand mb-3">
              Keeping it clean
            </div>
            <h2 className="text-[2rem] sm:text-[2.6rem] leading-[1.12] font-semibold tracking-tight mb-4">
              Weekly cleaning
              <span className="text-gradient-amber"> across DFW.</span>
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed">
              Licensed, insured techs. Chemicals included. Every visit ends with a photo
              report in your inbox — no guessing, no surprise invoices.
            </p>
          </div>

          <div className="mb-12 grid gap-4 sm:grid-cols-3">
            {[
              { src: photoRescueTube.url, alt: "Savvy Swim rescue tube floating in a sparkling clean pool" },
              { src: photoSavvyRings.url, alt: "Red and white striped Savvy pool rings floating in clear water" },
              { src: photoSavvyLetters.url, alt: "Inflatable SAVVY letters floating in a bright blue pool" },
            ].map((p) => (
              <div key={p.src} className="overflow-hidden rounded-sm border border-hairline shadow-card">
                <img
                  src={p.src}
                  alt={p.alt}
                  loading="lazy"
                  className="aspect-[4/3] w-full object-cover transition-transform duration-700 hover:scale-105"
                />
              </div>
            ))}
          </div>



          <div className="grid md:grid-cols-3 gap-5">
            {cleaningPlans.map((plan) => (
              <div
                key={plan.id}
                className={`card-3d rounded-sm p-7 flex flex-col ${
                  plan.featured ? "ring-1 ring-amber-brand/50" : ""
                }`}
              >
                {plan.featured && (
                  <span className="self-start mb-4 rounded-full bg-amber-brand px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">
                    Most popular
                  </span>
                )}
                <h3 className="text-xl font-bold">{plan.name}</h3>
                <p className="text-sm text-muted-foreground mt-1 mb-5">{plan.blurb}</p>
                <div className="flex items-end gap-1 mb-6">
                  <span className="text-[1.5rem] font-semibold text-gradient-amber">Custom quote</span>
                </div>

                <ul className="space-y-2.5 mb-7">
                  {plan.items.map((it) => (
                    <li key={it} className="flex gap-2.5 text-sm text-foreground/85">
                      <CheckCircle2 className="h-4 w-4 text-amber-brand shrink-0 mt-0.5" />
                      {it}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => {
                    setSubscribePlan(`Request a quote — ${plan.name}`);
                    setSubscribeOpen(true);
                  }}
                  className="mt-auto inline-flex items-center justify-center gap-2 rounded-full bg-amber-brand px-5 py-3 text-sm font-semibold text-primary-foreground shadow-cta hover:brightness-110 transition"
                >
                  Get my quote <ArrowRight className="h-4 w-4" />
                </button>

              </div>
            ))}
          </div>

          {/* SAVVY SWIM CLUB — Riviera cabana luxe */}
          <div
            id="membership"
            className="mt-16 overflow-hidden rounded-sm border border-primary/10 shadow-3d"
          >
            <div className="flex flex-col lg:flex-row">
              {/* Membership card */}
              <div className="w-full lg:w-1/2 bg-card flex flex-col">
                <div className="stripes-navy h-6 w-full" />

                <div className="flex flex-1 flex-col p-8 sm:p-10">
                  <div className="mb-6 flex items-start justify-between gap-6">
                    <div>
                      <span className="font-badge block text-lg leading-none tracking-[0.2em] text-red-brand">
                        Exclusivity
                      </span>
                      <h3 className="font-display mt-1 text-4xl sm:text-5xl leading-none text-navy-brand">
                        Swim Club
                      </h3>
                    </div>
                  </div>

                  <div className="mb-8">
                    <div className="flex items-baseline gap-2">
                      <span className="font-display text-5xl sm:text-6xl text-navy-brand">$19.99</span>
                      <span className="font-editorial italic text-xl text-primary/60">per month</span>
                    </div>
                    <p className="mt-2 text-sm font-semibold uppercase tracking-tight text-primary/80">
                      Member perks on every service call · 12-month agreement, billed monthly
                    </p>
                  </div>

                  <ul className="mb-10 space-y-4 text-sm text-primary">
                    {[
                      "50% off one filter clean (one time)",
                      "5% off all parts",
                      "7% off installation labor",
                      "24/7 text support",
                    ].map((perk) => (
                      <li key={perk} className="flex items-center gap-3">
                        <span className="h-1.5 w-1.5 shrink-0 rotate-45 bg-lifeguard" />
                        <span>{perk}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => setMembershipOpen(true)}
                    className="font-display mt-auto w-full bg-lifeguard py-5 text-xl uppercase tracking-[0.15em] text-primary-foreground transition-colors hover:bg-navy"
                  >
                    Join the Club
                  </button>
                  <p className="mt-3 text-center text-xs text-muted-foreground">
                    12-month agreement · Billed monthly at $19.99
                  </p>
                </div>
              </div>

              {/* FAQ block */}
              <div className="flex w-full flex-col bg-navy-brand p-8 sm:p-10 lg:w-1/2">
                <h4 className="font-editorial italic text-3xl text-canvas normal-case">
                  Membership Details
                </h4>
                <p className="mt-2 text-xs text-canvas/60">
                  Everything included with your $19.99/month Savvy Swim Club.
                </p>

                <Accordion type="single" collapsible className="mt-6">
                  {MEMBERSHIP_FAQ.map((item) => (
                    <AccordionItem
                      key={item.q}
                      value={item.q}
                      className="border-b border-canvas/20"
                    >
                      <AccordionTrigger className="text-left text-sm font-semibold uppercase tracking-wide text-canvas hover:no-underline [&>svg]:text-lifeguard">
                        {item.q}
                      </AccordionTrigger>
                      <AccordionContent className="text-xs leading-relaxed text-canvas/70">
                        {item.a}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>

                <div className="mt-auto flex items-center gap-4 pt-10">
                  <div className="h-px flex-grow bg-chlorine/30" />
                  <span className="font-badge text-xl tracking-[0.2em] text-chlorine">
                    Santana &amp; Rivera
                  </span>
                  <div className="h-px flex-grow bg-chlorine/30" />
                </div>
              </div>
            </div>
          </div>


        </div>
      </section>



      {/* MARKETING */}
      <section id="portfolio" className="py-24 sm:py-32 relative">
        <div className="container-tight">
          <div className="max-w-3xl mb-14">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-brand mb-3">
              Why Savvy Swim
            </div>
            <h2 className="text-[2rem] sm:text-[2.6rem] leading-[1.12] font-semibold tracking-tight">
              Never think about your pool
              <br />
              <span className="text-gradient-chrome">again.</span>
            </h2>
            <p className="text-muted-foreground mt-5 text-base sm:text-lg leading-relaxed max-w-2xl">
              One flat weekly rate. Certified techs, balanced water, working equipment, and a photo
              report in your inbox after every single visit — so you always know exactly what was
              done.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {[
              {
                icon: CalendarCheck,
                title: "Same tech, same day, every week",
                desc: "You get a dedicated technician on a fixed schedule — no rotating crews, no surprise skips.",
              },
              {
                icon: ShieldCheck,
                title: "Clear water guaranteed",
                desc: "If your water isn't swim-ready after a visit, we come back and fix it at no charge.",
              },
              {
                icon: Wrench,
                title: "Repairs handled in-house",
                desc: "Pumps, heaters, filters, salt cells and automation — diagnosed and repaired by the same team.",
              },
            ].map((b) => (
              <div key={b.title} className="card-3d rounded-sm p-7 sm:p-8 flex flex-col">
                <b.icon className="h-6 w-6 text-amber-brand mb-5" />
                <h3 className="text-lg font-semibold mb-2">{b.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{b.desc}</p>
              </div>
            ))}
          </div>

          <div className="card-3d rounded-sm overflow-hidden grid md:grid-cols-2">
            <div className="relative min-h-[280px]">
              <img
                src={photoLifeguardChair.url}
                alt="Savvy Swim branded umbrella beside a crystal-clear serviced pool"
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover"
              />
            </div>
            <div className="p-8 sm:p-12 flex flex-col justify-center">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-brand mb-4">
                New customer offer
              </div>
              <h3 className="text-[1.7rem] sm:text-[2.1rem] leading-[1.1] font-semibold tracking-tight mb-5">
                First month of weekly service, half off.
              </h3>
              <ul className="space-y-3 mb-8">
                {[
                  "Free on-site water test and equipment inspection",
                  "Photo report emailed after every visit",
                  "No contracts on weekly service — cancel anytime",
                ].map((i) => (
                  <li key={i} className="flex gap-3 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-amber-brand shrink-0 mt-0.5" />
                    {i}
                  </li>
                ))}
              </ul>
              <div className="flex flex-col sm:flex-row gap-3">
                <a
                  href={PHONE_HREF}
                  className="btn-quote inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-sm text-sm font-bold uppercase tracking-wider"
                >
                  <Phone className="h-4 w-4" /> Call (469) 213-8087
                </a>
                <a
                  href={`mailto:${EMAIL}?subject=${encodeURIComponent("Free pool service quote")}`}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-sm border border-hairline text-sm font-bold uppercase tracking-wider hover:bg-muted transition"
                >
                  Get a free quote <ArrowRight className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* TESTIMONIALS */}
      <section className="py-24 sm:py-32 relative bg-ink/40 border-y border-hairline overflow-hidden">
        <div className="container-tight">
          <div className="max-w-2xl mb-12">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-brand mb-3">
              Neighbors talking
            </div>
            <h2 className="text-[2rem] sm:text-[2.6rem] leading-[1.12] font-semibold tracking-tight">
              Loved by neighbors
              <span className="text-gradient-amber"> across DFW.</span>
            </h2>
            <p className="text-muted-foreground mt-4">
              200+ five-star reviews from Dallas–Fort Worth homeowners. Hover to pause.
            </p>
          </div>
        </div>

        <div className="marquee-pause marquee-fade space-y-4">
          {[REVIEWS_ROW_1, REVIEWS_ROW_2].map((row, rowIdx) => (
            <div
              key={rowIdx}
              className={`flex w-max gap-4 ${
                rowIdx === 0 ? "animate-marquee-slow" : "animate-marquee-slow-reverse"
              }`}
            >
              {[...row, ...row].map((t, i) => (
                <div
                  key={`${rowIdx}-${i}`}
                  className="card-3d rounded-sm p-6 w-[330px] sm:w-[380px] shrink-0"
                >
                  <div className="flex items-center gap-1 mb-4">
                    {[...Array(5)].map((_, s) => (
                      <Star key={s} className="h-4 w-4 fill-amber-brand text-amber-brand" />
                    ))}
                  </div>
                  <p className="text-sm text-foreground/90 leading-relaxed mb-6">"{t.q}"</p>
                  <div className="flex items-center gap-3 pt-4 border-t border-hairline">
                    <div className="h-9 w-9 rounded-full bg-amber-brand/15 grid place-items-center text-amber-brand font-bold text-sm">
                      {t.a[0]}
                    </div>
                    <div>
                      <div className="text-sm font-semibold">{t.a}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {t.c}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>


      {/* ABOUT */}
      <section id="about" className="py-24 sm:py-32 relative">
        <div className="container-tight">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-brand mb-3">
                Why folks pick us
              </div>
              <h2 className="text-[2rem] sm:text-[2.6rem] leading-[1.12] font-semibold tracking-tight mb-6">
                Techs, not middlemen —
                <span className="text-gradient-amber"> service you can count on.</span>
              </h2>
              <p className="text-muted-foreground text-lg leading-relaxed mb-8">
                We don't sub out your pool. Savvy Swim keeps cleaning, chemistry,
                and equipment repair in-house — so the same trained tech knows your
                pool, your equipment, and exactly what it needs.
              </p>
              <ul className="space-y-3">
                {[
                  "Same tech every week — no rotating crews",
                  "Chemicals and photo reports included",
                  "Licensed, bonded, and insured in Texas",
                  "Repairs quoted up front, no surprise invoices",
                ].map((b) => (
                  <li key={b} className="flex items-start gap-3 text-sm">
                    <ShieldCheck className="h-5 w-5 text-amber-brand flex-shrink-0 mt-0.5" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="relative">
              <div className="absolute -inset-8 bg-gradient-radial opacity-70 blur-3xl" />
              <div className="relative card-3d rounded-sm p-8 shadow-3d">
                <div className="flex items-center gap-3 mb-6">
                  <div className="relative h-12 w-12 rounded-full bg-amber-brand grid place-items-center shadow-cta">
                    <Waves className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <div>
                    <div className="font-bold">Savvy Swim</div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-[0.18em]">A Santana &amp; Rivera Company</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-px bg-hairline rounded-sm overflow-hidden">
                  {[
                    { k: "1,200+", v: "Pools serviced", icon: Droplets },
                    { k: "100%", v: "Satisfaction guarantee", icon: ShieldCheck },
                    { k: "4.9★", v: "Avg client rating", icon: Star },
                    { k: "365", v: "Days of service", icon: Sun },
                  ].map((s) => (
                    <div key={s.v} className="bg-ink-soft p-5">
                      <s.icon className="h-4 w-4 text-amber-brand mb-3" />
                      <div className="text-2xl font-bold text-gradient-chrome">{s.k}</div>
                      <div className="text-xs text-muted-foreground mt-1">{s.v}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-6 flex items-center gap-1 text-xs text-muted-foreground">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-3.5 w-3.5 fill-amber-brand text-amber-brand" />
                  ))}
                  <span className="ml-2">Trusted across Austin, Dallas & Houston</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="contact" className="py-24 sm:py-32 relative overflow-hidden">
        <div className="container-tight">
          <div className="relative rounded-sm overflow-hidden card-3d p-10 sm:p-16 text-center shadow-3d">
            <div className="absolute inset-0">
              <img src={poolNight} alt="" className="absolute inset-0 w-full h-full object-cover opacity-25" />
            </div>
            <div className="absolute inset-0 bg-gradient-radial opacity-90" />
            <div className="absolute inset-0 water-caustics opacity-50" />
            <div className="absolute inset-0 grid-bg opacity-10" />
            <div className="relative">
              <div className="mx-auto mb-6 relative h-16 w-16 rounded-full bg-amber-brand grid place-items-center shadow-cta animate-float">
                <Waves className="h-7 w-7 text-primary-foreground" />
              </div>
              <h2 className="text-[2.25rem] sm:text-[3rem] leading-[1.1] font-semibold tracking-tight mb-4">
                Ready to dive in?
                <br />
                <span className="text-gradient-amber italic">Let's clean your pool.</span>
              </h2>
              <p className="text-foreground/80 text-lg max-w-xl mx-auto mb-8">
                Book a free on-site water test and equipment check — we'll quote
                your weekly service or repair on the spot. No pressure, no contracts.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  type="button"
                  onClick={() => openBooking("Weekly Pool Cleaning")}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-amber-brand px-7 py-4 text-sm font-semibold text-primary-foreground shadow-cta hover:brightness-110 transition"
                >
                  <CalendarCheck className="h-4 w-4" /> Book my free water test
                </button>
                <a
                  href={PHONE_HREF}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-hairline bg-ink-soft/60 px-7 py-4 text-sm font-semibold hover:bg-ink-soft transition"
                >
                  <Phone className="h-4 w-4" /> {PHONE_DISPLAY}
                </a>
              </div>
              <p className="mt-5 text-xs text-muted-foreground">
                Licensed · Bonded · Insured · Mon–Sat 7a–7p CT
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-hairline py-10">
        <div className="container-tight flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Waves className="h-4 w-4 text-amber-brand" />
            <span>© {new Date().getFullYear()} Savvy Swim · A Santana & Rivera Company. All rights reserved.</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            <a href={`mailto:${EMAIL}`} title="Email us" className="hover:text-foreground transition">{EMAIL}</a>
            <a href={PHONE_HREF} title="Call us" className="hover:text-foreground transition">{PHONE_DISPLAY}</a>
            <a href="/privacy-policy" className="hover:text-foreground transition">Privacy Policy</a>
            <a href="/terms-and-conditions" className="hover:text-foreground transition">Terms &amp; Conditions</a>
            <a href="/auth" className="hover:text-foreground transition">Admin</a>
          </div>
        </div>
      </footer>

      <BookingDialog
        open={bookingOpen}
        onOpenChange={setBookingOpen}
        defaultService={bookingService}
      />
      <OrderDialog item={orderItem} open={orderOpen} onOpenChange={setOrderOpen} />
      <SubscribeDialog
        open={subscribeOpen}
        onOpenChange={setSubscribeOpen}
        planName={subscribePlan}
      />
      <MembershipDialog open={membershipOpen} onOpenChange={setMembershipOpen} />


    </div>
  );
};

export default Index;
