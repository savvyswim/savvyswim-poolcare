import { useEffect, useRef, useState, lazy, Suspense } from "react";
import {
  Mail,
  Phone,
  Instagram,
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
  Menu,
  MessageSquare,
  X,
} from "lucide-react";

import { IMG_5512_PNG as photoLifeguardChair } from "@/assets/photos";
import { IMG_5507_2_JPG as photoNavyCabana } from "@/assets/photos";
import { IMG_5508_2_JPG as photoRivieraLoungers } from "@/assets/photos";
import { pool_water_hd_jpg as photoPoolWater } from "@/assets/photos";
import photoPoolWaterMobile from "@/assets/pool-water-mobile.webp.asset.json";
import { IMG_5518_PNG as photoSavvyRings } from "@/assets/photos";
import photoRescueTube from "@/assets/IMG_5503.jpg.asset.json";
import { IMG_5502_PNG as photoSavvyLetters } from "@/assets/photos";

const poolDesign = photoNavyCabana.url;
const poolNight = photoRivieraLoungers.url;

import Seo from "@/components/Seo";
import { buildSmsHref, trackContactClick } from "@/lib/contactTracking";
import { SmoothLoopVideo } from "@/components/SmoothLoopVideo";
import type { OrderItem } from "@/components/OrderDialog";

// Dialogs are only needed after a click — keep them out of the first payload.
const BookingDialog = lazy(() =>
  import("@/components/BookingDialog").then((m) => ({ default: m.BookingDialog })),
);
const OrderDialog = lazy(() =>
  import("@/components/OrderDialog").then((m) => ({ default: m.OrderDialog })),
);
const SubscribeDialog = lazy(() =>
  import("@/components/SubscribeDialog").then((m) => ({ default: m.SubscribeDialog })),
);
const MembershipDialog = lazy(() =>
  import("@/components/MembershipDialog").then((m) => ({ default: m.MembershipDialog })),
);
const SwimClubPrompt = lazy(() =>
  import("@/components/SwimClubPrompt").then((m) => ({ default: m.SwimClubPrompt })),
);
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const MEMBERSHIP_FAQ = [
  {
    q: "Summer offer — what's free for new customers?",
    a: "New customers who join the Savvy Swim Club on a 12-month agreement get their first service visit free. Offer applies to new customers only, one per household, and requires the 12-month Swim Club agreement to stay in place. If the agreement is cancelled early, the value of the free visit is billed at standard rates.",
  },
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
import { Link } from "@/lib/router-compat";
import { supabase } from "@/integrations/supabase/client";


const EMAIL = "hi@savagepools.us";
const PHONE_DISPLAY = "(469) 744-0379";
const PHONE_HREF = "tel:+14697440379";
const SMS_PHONE = "+14697440379";

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
  const [menuOpen, setMenuOpen] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);
  // Defer the swim-club prompt until the page is interactive on mobile.
  const [promptReady, setPromptReady] = useState(false);
  useEffect(() => {
    const w = window as unknown as { requestIdleCallback?: (cb: () => void) => number };
    const start = () => setPromptReady(true);
    if (w.requestIdleCallback) {
      w.requestIdleCallback(start);
      return;
    }
    const t = window.setTimeout(start, 2000);
    return () => window.clearTimeout(t);
  }, []);
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
              <Link to="/services" className="hover:opacity-80 transition">Services</Link>
              <Link to="/privacy-policy" className="hover:opacity-80 transition">Warranty &amp; Privacy</Link>
              <span className="font-semibold">Service: {PHONE_DISPLAY}</span>
            </div>
          </div>
        </div>

        <div
          className={`bg-background border-b border-hairline transition-shadow duration-300 ${
            scrolled ? "shadow-card" : ""
          }`}
        >
          <div className="container-tight flex h-[64px] items-center justify-between gap-2 sm:h-[76px] sm:gap-4">
            <a href="#" aria-label="Savvy Swim — home" className="flex min-w-0 shrink items-center gap-3">
              <span className="whitespace-nowrap font-display text-[1.15rem] uppercase leading-none tracking-tight text-accent xs:text-[1.3rem] sm:text-[1.6rem] lg:text-[1.9rem]">
                Savvy Swim
              </span>
              <span aria-hidden="true" className="hidden whitespace-nowrap font-tech text-[9px] leading-tight text-primary/60 lg:block xl:hidden">
                On duty, so you don&rsquo;t have to be.
              </span>
            </a>

            <nav className="hidden min-w-0 shrink items-center gap-5 whitespace-nowrap font-tech text-primary/70 xl:flex 2xl:gap-7">
              <a href="#cleaning" className="hover:text-accent transition">Pool Cleaning</a>
              <Link to="/services" className="hover:text-accent transition">Service &amp; Repair</Link>
              <a href="#refer" className="hover:text-accent transition">Refer &amp; Save</a>
              <a href="#portfolio" className="hover:text-accent transition">Our Work</a>
              <a href="#about" className="hover:text-accent transition">About Us</a>
              <a href="#contact" className="hover:text-accent transition">Contact</a>
            </nav>


            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
              <a
                href={PHONE_HREF} onClick={() => trackContactClick("call_click", "header")}
                className="hidden lg:inline-flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm font-semibold text-foreground hover:text-primary transition"
              >
                <Phone className="h-4 w-4 text-amber-brand" /> {PHONE_DISPLAY}
              </a>
              <a
                href={PHONE_HREF}
                onClick={() => trackContactClick("call_click", "header_mobile")}
                aria-label={`Call ${PHONE_DISPLAY}`}
                className="inline-flex items-center justify-center border border-primary/20 p-2.5 text-primary transition-colors hover:border-primary lg:hidden"
              >
                <Phone className="h-4 w-4" />
              </a>
              <button
                type="button"
                onClick={() => openBooking()}
                className="btn-quote inline-flex items-center gap-2 whitespace-nowrap rounded-md px-3.5 py-2.5 text-[11px] font-bold uppercase tracking-wide transition sm:px-5 sm:py-3 sm:text-[13px]"
              >
                <span className="sm:hidden">Quote</span>
                <span className="hidden sm:inline">Request Quote</span>
              </button>
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                aria-label="Toggle menu"
                aria-expanded={menuOpen}
                className="inline-flex items-center justify-center border border-primary/20 p-2.5 text-primary transition-colors hover:border-primary xl:hidden"
              >
                {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {menuOpen && (
            <nav className="border-t border-hairline bg-background xl:hidden">
              <div className="container-tight flex flex-col divide-y divide-primary/10 font-tech text-primary/80">
                {[
                  { label: "Pool Cleaning", href: "#cleaning" },
                  { label: "Swim Club", href: "#membership" },
                  { label: "Refer & Save", href: "#refer" },
                  { label: "Our Work", href: "#portfolio" },
                  { label: "About Us", href: "#about" },
                  { label: "Contact", href: "#contact" },
                ].map((l) => (
                  <a
                    key={l.href}
                    href={l.href}
                    onClick={() => setMenuOpen(false)}
                    className="py-3.5 text-[13px] uppercase tracking-[0.14em] transition-colors hover:text-accent"
                  >
                    {l.label}
                  </a>
                ))}
                <Link
                  to="/services"
                  onClick={() => setMenuOpen(false)}
                  className="py-3.5 text-[13px] uppercase tracking-[0.14em] transition-colors hover:text-accent"
                >
                  Service &amp; Repair
                </Link>
              </div>
            </nav>
          )}
        </div>
      </header>

      <ScrollReveal />

      {/* HERO — cream poster panel floating on a beach backdrop */}

      <section className="relative pt-[60px] sm:pt-32 lg:pt-36">
        {/* photo backdrop */}
        <div className="absolute inset-0 overflow-hidden" aria-hidden>
          <img
            src={photoPoolWater.url}
            srcSet={`${photoPoolWaterMobile.url} 960w, ${photoPoolWater.url} 1600w`}
            sizes="100vw"
            alt=""
            width={1920}
            height={1280}
            loading="eager"
            decoding="sync"
            fetchPriority="high"
            className="h-full w-full object-cover object-center [image-rendering:auto] [transform:translateZ(0)]"
          />
          <div className="absolute inset-0 bg-foreground/35" />
        </div>

        <div className="relative container-tight pb-10 pt-6 sm:pb-16 sm:pt-10">
          <div className="canvas-panel overflow-hidden">
            {/* ticker inside the panel */}
            <div className="overflow-hidden border-b border-primary/10">
              <div className="marquee-pause marquee-fade py-2.5">
                <div className="flex w-max animate-marquee-slow">
                  {[0, 1].map((dup) => (
                    <div key={dup} className="flex items-center whitespace-nowrap" aria-hidden={dup === 1}>
                      {TICKER_ITEMS.map((item, i) => (
                        <span key={`${dup}-${i}`} className="flex items-center">
                          <span className="tech-label flex items-center gap-2 text-[13px]">
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

            <div className="px-6 py-10 sm:px-10 sm:py-14 lg:px-14 lg:py-16 xl:px-20 xl:py-24">
              {/* photo trio */}
              <div className="grid grid-cols-3 gap-3 sm:gap-4 lg:ml-auto lg:w-[58%]">
                {[
                  { src: photoLifeguardChair.url, alt: "Savvy Swim lifeguard chair beside a serviced pool" },
                  { src: photoSavvyRings.url, alt: "Savvy Swim branded rescue rings" },
                  { src: photoRescueTube.url, alt: "Savvy Swim rescue tube poolside" },
                ].map((p) => (
                  <figure key={p.src} className="photo-tile">
                    <img
                      src={p.src}
                      alt={p.alt}
                      loading="lazy"
                      decoding="async"
                      className="aspect-[3/4] w-full object-cover"
                    />
                  </figure>
                ))}
              </div>

              {/* giant wordmark */}
              <h1 className="mt-10 sm:mt-14">
                <span className="type-mega block" style={{ fontSize: "clamp(3.4rem, 15vw, 11rem)" }}>
                  Savvy
                  <span className="block">Swim</span>
                </span>
              </h1>

              <div className="mt-8 flex flex-col gap-8 border-t border-primary/10 pt-8 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-lg">
                  <span className="tech-label flex items-center gap-2 text-accent">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent animate-blip" />
                    On duty — 24/7
                  </span>
                  <p className="mt-3 font-editorial text-[clamp(1.3rem,3vw,1.9rem)] leading-tight text-primary">
                    On duty, so you don&apos;t have to be.
                  </p>
                  <p className="mt-4 text-[16px] lg:text-[1.1rem] leading-relaxed lg:leading-[1.7] text-foreground/75">
                    Weekly pool cleaning, equipment service and repair across Dallas–Fort Worth. Photo report
                    after every visit — water not clear? We come back free, same day.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => openBooking("Weekly Service & Maintenance")}
                    className="btn-quote font-tech inline-flex items-center gap-2 px-7 py-3.5"
                  >
                    <CalendarCheck className="h-4 w-4" /> Start Service
                  </button>
                  <a
                    href={PHONE_HREF}
                    onClick={() => trackContactClick("call_click", "hero")}
                    className="font-tech inline-flex items-center gap-2 rounded-full border border-primary/25 px-7 py-3.5 text-primary transition-colors hover:border-primary"
                  >
                    <Phone className="h-4 w-4" /> {PHONE_DISPLAY}
                  </a>
                  <Link
                    to="/request-inspection"
                    className="font-tech inline-flex items-center gap-2 rounded-full border border-primary/25 px-7 py-3.5 text-primary transition-colors hover:border-primary"
                  >
                    <MessageSquare className="h-4 w-4" /> Request free pool visit
                  </Link>

                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Every visit includes — under the panel */}
        <div className="relative bg-canvas">
          <div className="container-tight grid gap-6 py-12 lg:gap-8 lg:py-16 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { n: "01", t: "Skim, brush & vacuum" },
              { n: "02", t: "Full chemistry balance" },
              { n: "03", t: "Baskets & filter check" },
              { n: "04", t: "Photo report after each visit" },
            ].map((s) => (
              <div key={s.n} className="card-3d px-5 py-6 lg:px-7 lg:py-8">
                <span className="font-display text-[13px] text-accent">{s.n}</span>
                <p className="mt-2 text-[15px] lg:text-base leading-snug lg:leading-relaxed text-primary/85">{s.t}</p>
              </div>
            ))}
          </div>
        </div>



        {/* Spec sheet grid */}
        <div className="relative bg-foreground text-on-media [&_.tech-label]:text-primary-foreground/70">
          <div className="absolute inset-0 overflow-hidden" aria-hidden>
            <img
              src={photoPoolWaterMobile.url}
              alt=""
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover object-center"
            />
            {/* Neutral scrim keeps the pool water blue while text stays legible. */}
            <div className="absolute inset-0 bg-foreground/55" />
          </div>
          <div className="relative">
          <div className="container-tight grid gap-x-10 gap-y-12 py-16 lg:gap-x-14 lg:py-24 xl:py-28 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <p className="tech-label">Method</p>
              <p className="mt-6 max-w-xl text-[17px] lg:text-[1.15rem] leading-relaxed lg:leading-[1.75] text-primary-foreground">
                Licensed technicians, calibrated chemistry, and monitored equipment. Every visit is logged,
                photographed, and time-stamped — classic pool craft, run like a control room.
              </p>
              <p className="mt-10 tech-label">Scope</p>
              <p className="mt-6 max-w-xl text-[17px] lg:text-[1.15rem] leading-relaxed lg:leading-[1.75] text-primary-foreground">
                Weekly maintenance is the baseline. From there: equipment repair, pump and filter service,
                salt and automation tuning, and green-pool recovery. No contracts.
              </p>
            </div>


            {/* Readouts */}
            <div className="lg:col-span-3">
              <p className="tech-label">Water Readout</p>
              <dl className="mt-6 divide-y divide-primary-foreground/25 border-y border-primary-foreground/25">
                {[
                  ["pH", "7.40"],
                  ["Free Cl", "3.0 ppm"],
                  ["Alkalinity", "100 ppm"],
                  ["Calcium", "300 ppm"],
                  ["Cyanuric", "50 ppm"],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between py-2.5">
                    <dt className="font-tech text-primary-foreground/70">{k}</dt>
                    <dd className="tech-readout text-sm text-primary-foreground">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="lg:col-span-3 lg:col-start-10">
              <p className="tech-label">Index of Services</p>
              <ul className="mt-6 divide-y divide-primary-foreground/20 border-y border-primary-foreground/20 text-[16px] font-medium text-primary-foreground">
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
                ].map((s) => (
                  <li key={s}>
                    <a href="#services" className="block py-2.5 transition-opacity hover:opacity-70">{s}</a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="container-tight mx-auto grid max-w-4xl grid-cols-1 gap-8 pb-16 text-center sm:grid-cols-3 sm:gap-6 lg:pb-24">


            {[
              { k: "1,200+", v: "Pools serviced" },
              { k: "4.9★", v: "Avg client rating" },
              { k: "52", v: "Visits per year" },
            ].map((s) => (
              <div key={s.v} className="flex flex-col items-center">
                <div className="font-editorial italic leading-none text-primary-foreground text-4xl sm:text-5xl lg:text-6xl">{s.k}</div>
                <div className="mt-3 tech-label">{s.v}</div>
              </div>
            ))}
          </div>
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
      <section data-reveal className="perf-section py-24 sm:py-32 lg:py-36 xl:py-44 relative bg-ink/40 border-y border-hairline overflow-hidden">
        <div className="absolute inset-0 water-caustics opacity-40" />
        <div className="container-tight relative">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="relative tilt-card">
              <div className="absolute -inset-6 bg-gradient-radial opacity-70 blur-3xl" />
              <div className="relative rounded-sm overflow-hidden shadow-3d border border-hairline">
                <img
                  src={poolDesign}
                  alt="Sparkling clean backyard pool maintained weekly by Savvy Swim"
                  loading="lazy"
                  decoding="async"
                  width={1920}
                  height={1280}
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
              <h2 className="text-[2rem] sm:text-[2.6rem] lg:text-[3.05rem] xl:text-[3.35rem] leading-[1.12] lg:leading-[1.07] font-semibold tracking-tight mb-6">
                Clean water,
                <span className="text-gradient-amber"> handled on a schedule.</span>
              </h2>
              <p className="text-muted-foreground text-lg lg:text-[1.175rem] leading-relaxed lg:leading-[1.75] mb-8">
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
      <section data-reveal id="cleaning" className="perf-section py-24 sm:py-32 lg:py-36 xl:py-44 relative bg-ink/40 border-y border-hairline">
        <div className="container-tight">
          <div className="max-w-2xl mb-12">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-brand mb-3">
              Keeping it clean
            </div>
            <h2 className="text-[2rem] sm:text-[2.6rem] lg:text-[3.05rem] xl:text-[3.35rem] leading-[1.12] lg:leading-[1.07] font-semibold tracking-tight mb-4">
              Weekly cleaning
              <span className="text-gradient-amber"> across DFW.</span>
            </h2>
            <p className="text-muted-foreground text-lg lg:text-[1.175rem] leading-relaxed lg:leading-[1.75]">
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
                  decoding="async"
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

                  <div className="mb-6 border border-lifeguard/40 bg-lifeguard/5 p-4">
                    <div className="flex items-center gap-2">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-lifeguard animate-blip" />
                      <span className="font-badge text-sm tracking-[0.2em] text-red-brand">
                        Summer new customer offer
                      </span>
                    </div>
                    <p className="font-display mt-2 text-2xl leading-none text-navy-brand">
                      First service visit free
                    </p>
                    <p className="mt-2 text-xs leading-relaxed text-primary/70">
                      For new customers who join the Swim Club bundle on a 12-month agreement. One
                      per household. Ends at the close of summer.
                    </p>
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
                      "First service visit free (new customers)",
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
                    Claim the summer offer
                  </button>
                  <p className="mt-3 text-center text-xs text-muted-foreground">
                    12-month agreement · Billed monthly at $19.99 · New customers only
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
                    On duty, so you don&apos;t have to be.
                  </span>

                  <div className="h-px flex-grow bg-chlorine/30" />
                </div>
              </div>
            </div>
          </div>


        </div>
      </section>

      {/* REFERRAL */}
      <section data-reveal id="refer" className="perf-section relative border-y border-hairline bg-navy-brand py-20 sm:py-28 lg:py-32 xl:py-40">
        <div className="container-tight">
          <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_1fr]">
            <div>
              <div className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-chlorine">
                Refer a neighbor
              </div>
              <h2 className="font-editorial text-[2.2rem] italic leading-[1.05] text-canvas sm:text-[3rem] lg:text-[3.5rem]">
                Get a free month.
              </h2>
              <p className="mt-5 max-w-xl text-base lg:text-[1.1rem] leading-relaxed lg:leading-[1.75] text-canvas/70">
                For every neighbor who signs up for 12 months of full service with your code, you get
                a free month of service. They get 20% off their first month.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <button
                  onClick={() => setMembershipOpen(true)}
                  className="font-display bg-lifeguard px-8 py-4 text-base uppercase tracking-[0.15em] text-primary-foreground transition-colors hover:bg-canvas hover:text-navy-brand"
                >
                  Get my referral code
                </button>
                <a
                  href="#contact"
                  className="font-display border border-canvas/30 px-8 py-4 text-base uppercase tracking-[0.15em] text-canvas transition-colors hover:border-canvas"
                >
                  Ask a question
                </a>
              </div>

              <p className="mt-4 text-xs leading-relaxed text-canvas/50">
                Free month credits after the neighbor&apos;s first paid month on a 12-month full-service
                agreement. Unlimited referrals. Credits apply to your service rate and can&apos;t be
                exchanged for cash.
              </p>
            </div>

            <div className="grid gap-3">
              {[
                { n: "01", t: "Share your code", d: "Every active customer gets a personal referral code in their welcome email and portal." },
                { n: "02", t: "They save 20%", d: "Your neighbor gets 20% off their first month when they start 12 months of full service." },
                { n: "03", t: "You get a free month", d: "Once their first month is paid, a full month of your service is credited to your account." },
              ].map((s) => (
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
        </div>
      </section>





      {/* MARKETING */}
      <section data-reveal id="portfolio" className="perf-section py-24 sm:py-32 lg:py-36 xl:py-44 relative">
        <div className="container-tight">
          <div className="max-w-3xl mb-14">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-brand mb-3">
              Why Savvy Swim
            </div>
            <h2 className="text-[2rem] sm:text-[2.6rem] lg:text-[3.05rem] xl:text-[3.35rem] leading-[1.12] lg:leading-[1.07] font-semibold tracking-tight">
              Never think about your pool
              <br />
              <span className="text-gradient-chrome">again.</span>
            </h2>
            <p className="text-muted-foreground mt-5 text-base sm:text-lg lg:text-[1.175rem] leading-relaxed lg:leading-[1.75] max-w-2xl">
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
                <p className="text-sm lg:text-[0.98rem] text-muted-foreground leading-relaxed lg:leading-[1.7]">{b.desc}</p>
              </div>
            ))}
          </div>

        </div>
      </section>


      {/* TESTIMONIALS */}
      <section data-reveal className="perf-section py-24 sm:py-32 lg:py-36 xl:py-44 relative bg-ink/40 border-y border-hairline overflow-hidden">
        <div className="container-tight">
          <div className="max-w-2xl mb-12">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-brand mb-3">
              Neighbors talking
            </div>
            <h2 className="text-[2rem] sm:text-[2.6rem] lg:text-[3.05rem] xl:text-[3.35rem] leading-[1.12] lg:leading-[1.07] font-semibold tracking-tight">
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
                  <p className="text-sm lg:text-base text-foreground/90 leading-relaxed lg:leading-[1.75] mb-6">"{t.q}"</p>
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





      {/* LOCAL AREA */}
      <section data-reveal className="perf-section py-12 border-t border-hairline">
        <div className="container-tight flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div>
            <div className="font-tech text-[10px] uppercase tracking-[0.24em] text-muted-foreground">Areas we serve</div>
            <p className="mt-2 text-base">
              Live in Frisco?{" "}
              <Link
                to="/pool-cleaning-frisco-tx"
                className="text-amber-brand font-semibold underline underline-offset-4 hover:brightness-110 transition"
              >
                See our Frisco, TX pool cleaning page
              </Link>{" "}
              — route days, neighborhoods, and local pricing.
            </p>
          </div>
          <Link
            to="/pool-cleaning-frisco-tx"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-hairline px-6 py-3 text-sm font-semibold hover:bg-ink-soft transition flex-shrink-0"
          >
            Pool Cleaning Frisco TX
          </Link>
        </div>
      </section>

      {/* CTA */}
      <section data-reveal id="contact" className="perf-section py-24 sm:py-32 lg:py-36 xl:py-44 relative overflow-hidden">
        <div className="container-tight">
          <div className="relative rounded-sm overflow-hidden card-3d p-10 sm:p-16 text-center shadow-3d">
            <div className="absolute inset-0">
              <img src={poolNight} alt="" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover opacity-25" />
            </div>
            <div className="absolute inset-0 bg-gradient-radial opacity-90" />
            <div className="absolute inset-0 water-caustics opacity-50" />
            <div className="absolute inset-0 grid-bg opacity-10" />
            <div className="relative">
              <div className="mx-auto mb-6 relative h-16 w-16 rounded-full bg-amber-brand grid place-items-center shadow-cta animate-float">
                <Waves className="h-7 w-7 text-primary-foreground" />
              </div>
              <h2 className="text-[2.25rem] sm:text-[3rem] lg:text-[3.6rem] xl:text-[4rem] leading-[1.1] lg:leading-[1.05] font-semibold tracking-tight mb-4">
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
                  href={PHONE_HREF} onClick={() => trackContactClick("call_click", "final_cta")}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-hairline bg-ink-soft/60 px-7 py-4 text-sm font-semibold hover:bg-ink-soft transition"
                >
                  <Phone className="h-4 w-4" /> {PHONE_DISPLAY}
                </a>
                <a
                  href={buildSmsHref(SMS_PHONE)} onClick={() => trackContactClick("text_click", "final_cta_text")}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-hairline bg-ink-soft/60 px-7 py-4 text-sm font-semibold hover:bg-ink-soft transition"
                >
                  <MessageSquare className="h-4 w-4" /> Text for a free pool quote
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
            <a href={PHONE_HREF} onClick={() => trackContactClick("call_click", "footer")} title="Call us" className="hover:text-foreground transition">{PHONE_DISPLAY}</a>
            <a href="https://www.instagram.com/hi.savvyswim?igsh=a2g5eWpndHA0Zm5j&amp;utm_source=qr" target="_blank" rel="noopener noreferrer" aria-label="Savvy Swim on Instagram" className="inline-flex items-center gap-1.5 hover:text-foreground transition"><Instagram className="h-4 w-4" />Instagram</a>
            <Link to="/pool-cleaning-frisco-tx" className="hover:text-foreground transition">Pool Cleaning Frisco TX</Link>
            <Link to="/privacy-policy" className="hover:text-foreground transition">Privacy Policy</Link>
            <Link to="/terms-and-conditions" className="hover:text-foreground transition">Terms &amp; Conditions</Link>
            <Link to="/auth" className="hover:text-foreground transition">Admin</Link>
          </div>
        </div>
      </footer>

      <Suspense fallback={null}>
        {bookingOpen && (
          <BookingDialog
            open={bookingOpen}
            onOpenChange={setBookingOpen}
            {...(bookingService !== undefined ? { defaultService: bookingService } : {})}
          />
        )}
        {orderOpen && (
          <OrderDialog item={orderItem} open={orderOpen} onOpenChange={setOrderOpen} />
        )}
        {subscribeOpen && (
          <SubscribeDialog
            open={subscribeOpen}
            onOpenChange={setSubscribeOpen}
            {...(subscribePlan !== undefined ? { planName: subscribePlan } : {})}
          />
        )}
        {membershipOpen && (
          <MembershipDialog open={membershipOpen} onOpenChange={setMembershipOpen} />
        )}
        {promptReady && <SwimClubPrompt onJoin={() => setMembershipOpen(true)} />}
      </Suspense>


    </div>
  );
};

export default Index;
