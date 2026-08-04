import { useEffect, useRef, useState } from "react";
import {
  Mail,
  Phone,
  Waves,
  Droplets,
  Sparkles,
  Sun,
  Wrench,
  Hammer,
  Cpu,
  Flame,
  ArrowRight,
  CheckCircle2,
  Star,
  MapPin,
  ShieldCheck,
  CalendarCheck,
  ShoppingCart,
} from "lucide-react";
import heroVideo from "@/assets/pool-hero.mp4.asset.json";
import photoModernPatio from "@/assets/AdobeStock_90446020.jpg.asset.json";
import photoSunsetVilla from "@/assets/AdobeStock_116633511.jpg.asset.json";
import photoStoneCourtyard from "@/assets/AdobeStock_191328716.jpg.asset.json";
import photoDeskSunset from "@/assets/AdobeStock_470929864.jpg.asset.json";
import photoResortLap from "@/assets/AdobeStock_517091924.jpg.asset.json";
import photoFamilySplash from "@/assets/AdobeStock_528893688.jpg.asset.json";
import photoGeometric from "@/assets/AdobeStock_548072467.jpg.asset.json";
import photoWhiteHouse from "@/assets/AdobeStock_559236027.jpg.asset.json";
import photoTexasFreeform from "@/assets/AdobeStock_611792597.jpg.asset.json";
import photoKidSwim from "@/assets/AdobeStock_77771910.jpg.asset.json";

const heroPoster = photoTexasFreeform.url;
const poolDesign = photoGeometric.url;
const poolNight = photoSunsetVilla.url;
const poolService = photoResortLap.url;

import { BookingDialog } from "@/components/BookingDialog";
import Seo from "@/components/Seo";
import { CursorFollower } from "@/components/CursorFollower";
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
    q: "How long is the Swim Club commitment?",
    a: "Savvy Swim Club is a 12-month agreement billed monthly at $19.99. Your perks start the day you join and stay active for the full term. At the end of the 12 months the membership continues month to month unless you tell us to stop.",
  },
  {
    q: "How does the 50% off filter clean work?",
    a: "Members get one filter clean at 50% off during the membership term. It is a one-time benefit per membership — just mention it when you schedule and we apply the discount automatically on the invoice.",
  },
  {
    q: "What does the 5% parts discount cover?",
    a: "5% off all parts we supply — pumps, filters, motors, valves, heaters, salt cells, lights, and standard replacement hardware. The discount is applied to the parts line of your invoice on every job during your membership.",
  },
  {
    q: "What does the 7% installation discount cover?",
    a: "7% off installation labor on equipment we install for you, including pump and filter swaps, heater and salt system installs, automation, and lighting. It applies to the labor portion of the invoice.",
  },
  {
    q: "Are repairs and inspections eligible?",
    a: "Yes. Repair visits and equipment inspections are eligible for member pricing — parts on a repair get 5% off and any installation labor gets 7% off. Members are also prioritized on the schedule for diagnostic and inspection appointments.",
  },
  {
    q: "What is not included?",
    a: "The Swim Club is a discount and support program, not a service plan. Weekly cleaning, chemicals, and full-service maintenance are billed under a Savvy cleaning plan. Discounts do not stack with promo codes or other active offers.",
  },
  {
    q: "What is 24/7 text support?",
    a: "Text us any time at your service number with a photo or question about your pool. Members get answers on water chemistry, equipment alarms, and troubleshooting outside normal business hours.",
  },
  {
    q: "Can I cancel?",
    a: "The agreement runs 12 months. You can cancel at the end of the term, or contact us if your property situation changes — for example if you sell the home — and we will work with you.",
  },
];
import { supabase } from "@/integrations/supabase/client";
import { useCart, money } from "@/hooks/useCart";


const EMAIL = "hi@savagepools.us";
const PHONE_DISPLAY = "(469) 213-8087";
const PHONE_HREF = "tel:+14692138087";

const REVIEWS_ROW_1 = [
  { q: "The 3D design sold us instantly — what we saw on screen is exactly what we got in the backyard.", a: "Megan R.", c: "Plano, TX" },
  { q: "Crew was on time, on budget, and the spa is unreal at night. Best decision we made for our home.", a: "Daniel K.", c: "Frisco, TX" },
  { q: "Weekly service is flawless. I haven't touched a chemical in two years and the water looks like glass.", a: "Priya S.", c: "Southlake, TX" },
  { q: "They rebuilt our 1990s pool into a modern infinity edge. Neighbors keep asking who did it.", a: "Chris B.", c: "Fort Worth, TX" },
  { q: "Permits, HOA approval, everything handled. We just picked tile and watched it happen.", a: "Alyssa M.", c: "Highland Park, TX" },
  { q: "Gunite to plaster in under nine weeks through a rainy spring. Communication was daily.", a: "Marcus T.", c: "Arlington, TX" },
];

const REVIEWS_ROW_2 = [
  { q: "The fire bowls and tanning ledge turned our small lot into a resort. Worth every dollar.", a: "Jenna W.", c: "McKinney, TX" },
  { q: "Automation on my phone — heater, lights, spa. I run the whole pool from the couch.", a: "Ravi P.", c: "Irving, TX" },
  { q: "Third bid we got, first one that showed a real 3D render. Easy choice.", a: "Tyler G.", c: "Grapevine, TX" },
  { q: "Warranty claim on a pump was handled in 48 hours, no argument. That's rare.", a: "Sharon L.", c: "Rockwall, TX" },
  { q: "They protected our lawn, cleaned daily, and finished ahead of schedule.", a: "Omar H.", c: "Allen, TX" },
  { q: "Our backyard in Keller was a slope. They engineered it into a two-level pool and spa.", a: "Brittany N.", c: "Keller, TX" },
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
  const cart = useCart();


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
      <CursorFollower />
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
              <a href="#services" className="hover:opacity-80 transition">Repairs</a>
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
              <div className="relative h-11 w-11 rounded-lg bg-amber-brand grid place-items-center shadow-cta">
                <Waves className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="font-bold tracking-tight text-base leading-tight flex flex-col">
                <span>SAVVY<span className="text-amber-brand">·</span>SWIM</span>
                <span className="text-[9px] font-medium tracking-[0.2em] text-muted-foreground uppercase">A Santana &amp; Rivera Company</span>
              </span>
            </a>
            <nav className="hidden xl:flex items-center gap-6 whitespace-nowrap text-[13px] font-semibold uppercase tracking-wide text-foreground/80">
              <a href="#cleaning" className="hover:text-primary transition">Pool Cleaning</a>
              <a href="#services" className="hover:text-primary transition">Service &amp; Repair</a>
              <a href="#portfolio" className="hover:text-primary transition">Our Work</a>
              <a href="#about" className="hover:text-primary transition">About Us</a>
              <a href="#contact" className="hover:text-primary transition">Contact</a>

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
                aria-label="Open cart"
                onClick={() => cart.setOpen(true)}
                className="hidden"
              >
                <ShoppingCart className="h-4.5 w-4.5" />
              </button>
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

      {/* HERO — Editorial studio */}
      <section className="relative bg-canvas pt-36 pb-0">
        <div className="container-tight">
          <h1 className="font-editorial italic text-primary tracking-tight leading-[1.05] text-[3rem] sm:text-[4.5rem] lg:text-[5.5rem] max-w-5xl pb-16">
            Crystal-clear pools, cared for every single week.
          </h1>
        </div>

        <div className="border-t border-primary/10">
          <div className="container-tight grid gap-14 py-20 lg:grid-cols-12">
            <div className="lg:col-span-6">
              <p className="text-sm text-primary/40">Our Process</p>
              <p className="mt-6 max-w-xl text-[17px] leading-relaxed text-primary/90">
                Licensed technicians, balanced chemistry, and spotless water — every visit, every week.
                We handle filtration, skimming, brushing, and equipment checks so your pool is always ready
                for the afternoon.
              </p>

              <p className="mt-12 text-sm text-primary/40">What We Do</p>
              <p className="mt-6 max-w-xl text-[17px] leading-relaxed text-primary/90">
                Weekly maintenance is the base of everything we offer. From there we cover equipment repairs,
                pump and filter service, and green-pool recovery — no contracts required to get started.
              </p>

              <div className="mt-10 flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={() => openBooking("Weekly Service & Maintenance")}
                  className="inline-flex items-center gap-2 bg-primary/[0.07] px-6 py-3.5 text-[13px] font-semibold uppercase tracking-[0.08em] text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
                >
                  <CalendarCheck className="h-4 w-4" /> Work With Us
                </button>
                <a
                  href={PHONE_HREF}
                  className="inline-flex items-center gap-2 px-2 py-3.5 text-[13px] font-semibold uppercase tracking-[0.08em] text-primary/70 hover:text-primary transition"
                >
                  <Phone className="h-4 w-4" /> {PHONE_DISPLAY}
                </a>
              </div>
            </div>

            <div className="lg:col-span-4 lg:col-start-9">
              <p className="text-sm text-primary/40">Our Services</p>
              <ul className="mt-6 space-y-3 text-[17px] text-primary">
                {[
                  "Weekly Pool Cleaning",
                  "Chemical Balancing",
                  "Filter &amp; Pump Service",
                  "Equipment Repair",
                  "Green Pool Recovery",
                  "Tile &amp; Deck Care",
                  "Salt System Service",
                  "Leak &amp; Plumbing Repair",
                  "Seasonal Openings",
                ].map((s) => (
                  <li key={s}>
                    <a href="#services" className="hover:text-accent transition-colors">
                      {s.replace(/&amp;/g, "&")}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="border-t border-primary/10">
          <div className="container-tight grid max-w-3xl grid-cols-3 gap-6 py-12">
            {[
              { k: "1,200+", v: "Pools serviced" },
              { k: "4.9★", v: "Avg client rating" },
              { k: "52", v: "Visits per year" },
            ].map((s) => (
              <div key={s.v}>
                <div className="font-editorial italic text-primary text-4xl">{s.k}</div>
                <div className="mt-2 text-xs uppercase tracking-[0.14em] text-primary/45">{s.v}</div>
              </div>
            ))}
          </div>
        </div>
      </section>



      {/* Side quote tab */}
      <button
        type="button"
        onClick={() => openBooking()}
        className="btn-quote hidden lg:flex fixed right-0 top-1/2 z-40 -translate-y-1/2 items-center rounded-l-md px-3 py-6 text-[11px] font-bold uppercase tracking-[0.22em] shadow-cta"
        style={{ writingMode: "vertical-rl" }}
      >
        Request a Quote
      </button>


      {/* MARQUEE */}
      <section className="border-y border-hairline bg-ink/60 py-6 overflow-hidden">
        <div className="flex animate-marquee gap-12 whitespace-nowrap text-sm uppercase tracking-[0.2em] text-muted-foreground">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="flex gap-12 items-center shrink-0">
              <span>Infinity Edge</span><span className="text-amber-brand">◆</span>
              <span>Glass Mosaic</span><span className="text-amber-brand">◆</span>
              <span>Spa & Hot Tub</span><span className="text-amber-brand">◆</span>
              <span>Fire Bowls</span><span className="text-amber-brand">◆</span>
              <span>Outdoor Kitchen</span><span className="text-amber-brand">◆</span>
              <span>LED Lighting</span><span className="text-amber-brand">◆</span>
              <span>Smart Automation</span><span className="text-amber-brand">◆</span>
            </div>
          ))}
        </div>
      </section>

      {/* SERVICES */}
      <section id="services" className="py-24 sm:py-32 relative">
        <div className="container-tight">
          <div className="max-w-2xl mb-14 border-t-2 border-accent pt-6">
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground mb-3">
              What we do
            </div>
            <h2 className="text-[2rem] sm:text-[2.6rem] leading-[1.12] font-semibold tracking-tight">
              Cleaning, service &amp; repair.
            </h2>
            <p className="mt-4 text-muted-foreground text-base leading-relaxed">
              Weekly maintenance, equipment repair, and everything in between —
              one team, one phone call, no contracts.
            </p>
          </div>


          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {
                icon: Droplets,
                title: "Weekly Pool Cleaning",
                desc: "Crystal-clear water, year-round. Certified techs handle chemistry, cleaning, and equipment checks.",
                includes: [
                  "Weekly chemistry balance",
                  "Skim, brush, vacuum & filter",
                  "Equipment inspection",
                  "Photo report after every visit",
                ],
                subject: "Quote — Weekly Cleaning",
              },
              {
                icon: Wrench,
                title: "Equipment Repair",
                desc: "Pumps, filters, heaters, and automation diagnosed and repaired — most parts stocked on the truck.",
                includes: [
                  "Pump & motor repair",
                  "Filter cleans & cartridge swaps",
                  "Heater diagnostics & repair",
                  "Valve & plumbing leaks",
                ],
                subject: "Quote — Equipment Repair",
              },
              {
                icon: Sparkles,
                title: "Green Pool Recovery",
                desc: "Algae, storm debris, or a pool left too long — we get it swim-ready fast with a full chemical reset.",
                includes: [
                  "Shock & algaecide treatment",
                  "Deep vacuum & brush-out",
                  "Filter deep clean",
                  "Follow-up balance visits",
                ],
                subject: "Quote — Green Pool Recovery",
              },
              {
                icon: Cpu,
                title: "Salt & Automation Service",
                desc: "Salt cell cleaning, chlorinator replacement, and smart controls tuned so your system runs hands-free.",
                includes: [
                  "Salt cell clean & replace",
                  "Pentair / Jandy / Hayward systems",
                  "Variable-speed pump programming",
                  "App control setup",
                ],
                subject: "Quote — Salt & Automation",
              },
              {
                icon: Sun,
                title: "Seasonal Openings & Closings",
                desc: "Get the pool ready for summer or buttoned up for winter — covers, freeze protection, and a full check.",
                includes: [
                  "Open & balance for the season",
                  "Winterize & freeze protection",
                  "Cover install & removal",
                  "Full equipment inspection",
                ],
                subject: "Quote — Seasonal Service",
              },
              {
                icon: ShieldCheck,
                title: "Tile, Deck & Surface Care",
                desc: "Waterline tile scale removal, deck wash-downs, and surface spot care to keep everything looking new.",
                includes: [
                  "Waterline tile cleaning",
                  "Calcium & scale removal",
                  "Deck & coping wash",
                  "Stain treatment",
                ],
                subject: "Quote — Surface Care",
              },
            ].map((s, i) => (
              <button
                key={s.title}
                type="button"
                onClick={() => openBooking(s.title)}
                title={`Click to book a free quote for ${s.title}`}
                aria-label={`Book a free quote for ${s.title}`}
                className="text-left card-3d rounded-sm p-6 sm:p-7 group flex flex-col cursor-pointer"
              >
                <div className="flex items-center gap-3 mb-5">
                  <s.icon className="h-[18px] w-[18px] text-amber-brand" strokeWidth={1.75} />
                  <span className="h-px flex-1 bg-hairline" />
                </div>
                <h3 className="text-[1.15rem] font-semibold mb-2 leading-snug">{s.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>

                <div className="my-5 h-px bg-hairline" />

                <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-3">
                  What's included
                </div>
                <ul className="space-y-2 mb-6">
                  {s.includes.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-amber-brand flex-shrink-0 mt-0.5" strokeWidth={1.75} />
                      <span className="text-foreground/90">{item}</span>
                    </li>
                  ))}
                </ul>

                <span
                  className="mt-auto inline-flex items-center justify-between gap-2 border-t border-hairline pt-4 text-[13px] font-semibold uppercase tracking-[0.1em] text-foreground group-hover:text-primary transition"
                >
                  <span className="inline-flex items-center gap-2">Book Free Quote</span>

                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </button>
            ))}
          </div>
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
              { src: photoFamilySplash.url, alt: "Family playing in a clean, freshly serviced backyard pool in Dallas–Fort Worth" },
              { src: photoKidSwim.url, alt: "Child swimming in crystal clear balanced pool water" },
              { src: photoModernPatio.url, alt: "Modern poolside patio with lounge chairs and shade sail" },
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

          {/* SAVVY MEMBERSHIP */}
          <div id="membership" className="mt-16 rounded-3xl border border-border bg-card p-8 sm:p-10 shadow-lg">
            <div className="flex flex-col lg:flex-row lg:items-center gap-8">
              <div className="flex-1">
                <span className="inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
                  Savvy Swim Club
                </span>
                <h3 className="mt-3 text-3xl font-bold">
                  $19.99 <span className="text-base font-medium text-muted-foreground">/ month</span>
                </h3>
                <p className="mt-2 text-muted-foreground max-w-xl">
                  Member perks on every service call. Requires a 12-month agreement, billed monthly.
                </p>

                <ul className="mt-5 grid gap-2 sm:grid-cols-2">
                  {[
                    "50% off one filter clean (one time)",
                    "5% off all parts",
                    "7% off installation labor",
                    "24/7 text support",
                  ].map((perk) => (
                    <li key={perk} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                      <span>{perk}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="lg:w-64">
                <button
                  onClick={() => setMembershipOpen(true)}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-amber-brand px-5 py-3.5 text-sm font-semibold text-primary-foreground shadow-cta hover:brightness-110 transition"
                >
                  Join the Swim Club <ArrowRight className="h-4 w-4" />
                </button>
                <p className="mt-3 text-center text-xs text-muted-foreground">
                  12-month agreement · Billed monthly at $19.99
                </p>

              </div>
            </div>

            {/* MEMBERSHIP FAQ */}
            <div className="mt-10 border-t border-border pt-8">
              <h4 className="text-lg font-semibold">Swim Club FAQ</h4>
              <p className="mt-1 text-sm text-muted-foreground">
                Everything included with your $19.99/month Savvy Swim Club.
              </p>
              <Accordion type="single" collapsible className="mt-4">
                {MEMBERSHIP_FAQ.map((item) => (
                  <AccordionItem key={item.q} value={item.q}>
                    <AccordionTrigger className="text-left text-sm font-semibold">
                      {item.q}
                    </AccordionTrigger>
                    <AccordionContent className="text-sm text-muted-foreground">
                      {item.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>

        </div>
      </section>



      {/* PORTFOLIO */}
      <section id="portfolio" className="py-24 sm:py-32 relative">
        <div className="container-tight">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
            <div className="max-w-xl">
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-brand mb-3">
                Backyards we've built
              </div>
              <h2 className="text-[2rem] sm:text-[2.6rem] leading-[1.12] font-semibold tracking-tight">
                Pools that turn
                <br />
                <span className="text-gradient-chrome">heads.</span>
              </h2>
            </div>
            <a href={`mailto:${EMAIL}?subject=${encodeURIComponent("Full portfolio request")}`} className="inline-flex items-center gap-2 text-sm font-semibold text-amber-brand hover:gap-3 transition-all">
              See full portfolio <ArrowRight className="h-4 w-4" />
            </a>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { img: photoTexasFreeform.url, tag: "Freeform", title: "Hill Country Freeform", desc: "Curved freeform gunite with flagstone coping, raised spa spillway and shaded oak deck.", metric: "gunite · flagstone · spa spillway" },
              { img: photoSunsetVilla.url, tag: "Pool & Spa", title: "Sunset Villa", desc: "Travertine deck, glass fencing and a raised spa with LED lighting — built for evenings outside.", metric: "spa · LED lighting · travertine" },
              { img: photoGeometric.url, tag: "Modern Geometric", title: "Clean Lines", desc: "Rectangular pool with tanning ledge, spillover spa and broom-finish concrete surround.", metric: "tanning ledge · spillover spa" },
              { img: photoWhiteHouse.url, tag: "Lap & Deck Jets", title: "White Modern", desc: "Long lap pool with deck jets, limestone coping and a crisp all-white architectural backdrop.", metric: "lap lane · deck jets · limestone" },
              { img: photoDeskSunset.url, tag: "Resort Style", title: "Desert Sunset", desc: "Free-form pool with boulder accents, paver decking and warm evening landscape lighting.", metric: "boulders · pavers · night lighting" },
              { img: photoStoneCourtyard.url, tag: "Courtyard", title: "Stone Courtyard", desc: "Kidney-shape pool wrapped in natural flagstone with an outdoor kitchen and lounge area.", metric: "flagstone · outdoor kitchen" },

            ].map((p) => (
              <a
                key={p.title}
                href={`mailto:${EMAIL}?subject=${encodeURIComponent(`Project inquiry — ${p.title}`)}`}
                title={`Click to ask about a ${p.tag.toLowerCase()} build like ${p.title}`}
                aria-label={`Inquire about ${p.title}`}
                className="card-3d rounded-sm overflow-hidden group tilt-card flex flex-col cursor-pointer hover:border-amber-brand/50 transition-colors"
              >
                <div className="relative aspect-[4/5] overflow-hidden">
                  <img
                    src={p.img}
                    alt={p.title}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
                  <div className="absolute top-4 left-4 inline-flex rounded-full glass px-3 py-1 text-[10px] uppercase tracking-[0.18em]">
                    {p.tag}
                  </div>
                  <div className="absolute bottom-4 right-4 inline-flex items-center gap-1.5 rounded-full bg-amber-brand px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-primary-foreground opacity-0 group-hover:opacity-100 transition shadow-cta">
                    Ask about this build <ArrowRight className="h-3 w-3" />
                  </div>
                </div>
                <div className="p-6 sm:p-7 flex flex-col flex-1">
                  <h3 className="text-xl font-semibold mb-2 text-gradient-amber">{p.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-6">{p.desc}</p>
                  <div className="mt-auto pt-5 border-t border-hairline flex items-center justify-between">
                    <span className="text-xs font-mono text-foreground/80">{p.metric}</span>
                    <ArrowRight className="h-4 w-4 text-amber-brand opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition" />
                  </div>
                </div>
              </a>
            ))}
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
                Builders, not brokers —
                <span className="text-gradient-amber"> in-house from dig to dive.</span>
              </h2>
              <p className="text-muted-foreground text-lg leading-relaxed mb-8">
                We don't sub out the hard parts. Savvy Swim owns excavation,
                gunite, plumbing, tile, plaster, and service in-house — so your
                pool is built by one team, backed by one warranty, and serviced
                by the people who know it best.
              </p>
              <ul className="space-y-3">
                {[
                  "In-house crews for every trade — no flaky subs",
                  "25-year structural warranty on every new build",
                  "Licensed, bonded, and insured in Texas",
                  "Free 3D design for qualified projects",
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
                    <span className="absolute inset-0 rounded-full border border-white/30 animate-ripple" />
                  </div>
                  <div>
                    <div className="font-bold">Savvy Swim</div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-[0.18em]">A Santana &amp; Rivera Company</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-px bg-hairline rounded-sm overflow-hidden">
                  {[
                    { k: "600+", v: "Pools built", icon: Hammer },
                    { k: "25 yr", v: "Structural warranty", icon: ShieldCheck },
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
                <span className="absolute inset-0 rounded-full border border-white/40 animate-ripple" />
              </div>
              <h2 className="text-[2.25rem] sm:text-[3rem] leading-[1.1] font-semibold tracking-tight mb-4">
                Ready to dive in?
                <br />
                <span className="text-gradient-amber italic">Let's design your pool.</span>
              </h2>
              <p className="text-foreground/80 text-lg max-w-xl mx-auto mb-8">
                Book a free on-site consultation and we'll send you a photoreal
                3D rendering of your pool — no pressure, no obligation.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  type="button"
                  onClick={() => openBooking("Custom Pool Design & Build")}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-amber-brand px-7 py-4 text-sm font-semibold text-primary-foreground shadow-cta hover:brightness-110 transition"
                >
                  <CalendarCheck className="h-4 w-4" /> Book my free 3D design
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
