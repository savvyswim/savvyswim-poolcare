import { useEffect, useMemo, useRef, useState } from "react";
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
  Search,
  X,
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
import { CursorFollower } from "@/components/CursorFollower";
import { SmoothLoopVideo } from "@/components/SmoothLoopVideo";
import { OrderDialog, type OrderItem } from "@/components/OrderDialog";
import { SubscribeDialog } from "@/components/SubscribeDialog";
import { supabase } from "@/integrations/supabase/client";
import { productImage, type Product } from "@/lib/products";
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
  const [products, setProducts] = useState<Product[]>([]);
  const [shopQuery, setShopQuery] = useState("");
  const [shopCategory, setShopCategory] = useState("all");
  const cart = useCart();

  const shopCategories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => p.category && set.add(p.category));
    return Array.from(set).sort();
  }, [products]);

  const visibleProducts = useMemo(() => {
    const q = shopQuery.trim().toLowerCase();
    return products.filter((p) => {
      const matchesCategory = shopCategory === "all" || p.category === shopCategory;
      const matchesQuery =
        !q ||
        [p.name, p.description, p.sku, p.category]
          .filter(Boolean)
          .some((f) => String(f).toLowerCase().includes(q));
      return matchesCategory && matchesQuery;
    });
  }, [products, shopQuery, shopCategory]);


  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .order("display_order");
      if (active && data) setProducts(data as unknown as Product[]);
    })();
    return () => {
      active = false;
    };
  }, []);

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
        title="Savvy Swim — Pool Cleaning & Custom Pools in Texas"
        description="Weekly pool cleaning, maintenance and custom pool construction across DFW and Texas. Free quote from Savvy Swim, a Santana & Rivera company."
        path="/"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "Savvy Swim",
          url: "https://savvyswim.com",
challenge: undefined,
        }}
      />
      <CursorFollower />
      {/* NAV */}
      <header className="fixed top-0 left-0 right-0 z-50">
        {/* Utility bar */}
        <div className="topbar hidden md:block text-[13px]">
          <div className="container-tight flex h-9 items-center justify-between gap-6">
            <a href="#services" className="font-semibold hover:opacity-80 transition">
              Also a full custom pool building company — Design &amp; Build →
            </a>
            <div className="flex items-center gap-6">
              <a href="#cleaning" className="hover:opacity-80 transition">Pool Cleaning</a>
              <a href="/shop" className="hover:opacity-80 transition">Shop</a>
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
              <a href="#services" className="hover:text-primary transition">Design &amp; Build</a>
              <a href="/shop" className="hover:text-primary transition">Shop</a>
              <a href="#portfolio" className="hover:text-primary transition">Portfolio</a>
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
                className="relative inline-flex items-center justify-center rounded-md border border-hairline h-10 w-10 hover:text-primary transition"
              >
                <ShoppingCart className="h-4.5 w-4.5" />
                {cart.count > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-amber-brand px-1 text-[10px] font-bold text-primary-foreground">
                    {cart.count}
                  </span>
                )}
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

      {/* HERO */}
      <section className="relative min-h-[100svh] flex items-center pt-32 pb-24 overflow-hidden">
        <div ref={heroRef} className="absolute inset-0 will-change-transform">
          <div className="absolute inset-0 h-[120%] w-full">
            <SmoothLoopVideo src={heroVideo.url} poster={heroPoster} fade={1.4} />
          </div>
        </div>
        <div className="absolute inset-0 hero-scrim" />

        <div className="container-tight relative z-10">
          <div className="mx-auto max-w-3xl text-center">
            {/* Shield emblem */}
            <div className="mx-auto mb-8 w-[92px]">
              <div className="rounded-t-md bg-white/95 px-3 pt-3 pb-2 shadow-cta">
                <div className="rounded-sm bg-primary px-2 py-3 text-center leading-none">
                  <div className="text-[13px] font-extrabold tracking-[0.16em] text-white">SAVVY</div>
                  <div className="text-[13px] font-extrabold tracking-[0.16em] text-white mt-1">SWIM</div>
                </div>
              </div>
              <div className="mx-auto -mt-2 h-9 w-9 rotate-45 rounded-[6px] border-[3px] border-white/95 bg-primary" />
            </div>

            <div className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-white/40 bg-black/25 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-on-media">
              Weekly Pool Cleaning &amp; Maintenance · DFW
            </div>

            <h1 className="text-on-media text-[2.3rem] leading-[1.1] sm:text-[3.1rem] lg:text-[3.6rem] font-bold tracking-tight">
              Crystal-Clear Pool Cleaning Service, Every Single Week
            </h1>
            <p className="text-on-media mt-5 text-lg sm:text-2xl font-medium opacity-95">
              Licensed techs, balanced chemistry, spotless water — no contracts to get started.
            </p>

            <div className="mt-9 flex flex-col sm:flex-row gap-3 justify-center">
              <button
                type="button"
                onClick={() => openBooking("Weekly Service & Maintenance")}
                className="btn-quote inline-flex items-center justify-center gap-2 rounded-md px-8 py-4 text-[13px] font-bold uppercase tracking-[0.1em] transition"
              >
                <CalendarCheck className="h-4 w-4" />
                Get My Cleaning Quote
              </button>
              <a
                href={PHONE_HREF}
                className="inline-flex items-center justify-center gap-2 rounded-md border border-white/50 px-8 py-4 text-[13px] font-bold uppercase tracking-[0.1em] text-on-media hover:bg-white/10 transition"
              >
                <Phone className="h-4 w-4" /> {PHONE_DISPLAY}
              </a>
            </div>

            <a
              href="#services"
              className="mt-6 inline-flex text-on-media text-sm font-semibold underline underline-offset-4 opacity-90 hover:opacity-100"
            >
              Building a new pool? See our custom design &amp; build services →
            </a>

            <div className="mx-auto mt-12 grid max-w-xl grid-cols-3 gap-6 border-t border-white/25 pt-6">
              {[
                { k: "1,200+", v: "Pools serviced" },
                { k: "4.9★", v: "Avg client rating" },
                { k: "52", v: "Visits per year" },
              ].map((s) => (
                <div key={s.v}>
                  <div className="text-on-media text-2xl sm:text-[2rem] font-bold">{s.k}</div>
                  <div className="text-on-media mt-1 text-[10px] uppercase tracking-[0.18em] opacity-80">{s.v}</div>
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
              Everything water, under one roof.
            </h2>
            <p className="mt-4 text-muted-foreground text-base leading-relaxed">
              From custom design and ground-up construction to weekly service
              and renovations — one team, one warranty, one phone call.
            </p>
          </div>


          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {
                icon: Hammer,
                title: "Custom Pool Design & Build",
                desc: "Bespoke gunite pools designed in photoreal 3D, engineered for your lot, lifestyle, and view.",
                includes: [
                  "On-site survey & 3D virtual tour",
                  "Structural engineering & permitting",
                  "Gunite shell, plumbing & equipment",
                  "Tile, coping, decking & landscape",
                ],
                subject: "Quote — Custom Pool Build",
              },
              {
                icon: Sparkles,
                title: "Spas & Water Features",
                desc: "Spillover spas, infinity edges, waterfalls, bubblers, and laminar deck jets that turn water into art.",
                includes: [
                  "Spillover & standalone spas",
                  "Infinity / vanishing edges",
                  "Waterfalls & sheer descents",
                  "Laminar jets & bubblers",
                ],
                subject: "Quote — Spa & Water Features",
              },
              {
                icon: Flame,
                title: "Outdoor Living",
                desc: "Extend the pool experience with kitchens, pergolas, fire bowls, and lounge decks built to entertain.",
                includes: [
                  "Outdoor kitchens & bars",
                  "Pergolas, cabanas & shade",
                  "Fire bowls & fire pits",
                  "Travertine & porcelain decking",
                ],
                subject: "Quote — Outdoor Living",
              },
              {
                icon: Wrench,
                title: "Renovation & Resurfacing",
                desc: "Bring tired pools back to life with new plaster, tile, equipment upgrades, and modern automation.",
                includes: [
                  "Plaster & pebble resurfacing",
                  "Waterline tile & coping",
                  "Equipment & pump upgrades",
                  "Salt system conversion",
                ],
                subject: "Quote — Renovation",
              },
              {
                icon: Droplets,
                title: "Weekly Service & Maintenance",
                desc: "Crystal-clear water, year-round. Certified techs handle chemistry, cleaning, and equipment checks.",
                includes: [
                  "Weekly chemistry balance",
                  "Skim, brush, vacuum & filter",
                  "Equipment inspection",
                  "Photo report after every visit",
                ],
                subject: "Quote — Weekly Service",
              },
              {
                icon: Cpu,
                title: "Smart Pool Automation",
                desc: "Control your pool from your phone — lights, heat, jets, salt, and chemistry, all in one app.",
                includes: [
                  "Pentair / Jandy / Hayward systems",
                  "Color-changing LED lighting",
                  "Variable-speed pumps",
                  "App control + voice integration",
                ],
                subject: "Quote — Pool Automation",
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

      {/* PROCESS — 3D design highlight */}
      <section className="py-24 sm:py-32 relative bg-ink/40 border-y border-hairline overflow-hidden">
        <div className="absolute inset-0 water-caustics opacity-40" />
        <div className="container-tight relative">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="relative tilt-card">
              <div className="absolute -inset-6 bg-gradient-radial opacity-70 blur-3xl" />
              <div className="relative rounded-sm overflow-hidden shadow-3d border border-hairline">
                <img
                  src={poolDesign}
                  alt="Modern rectangular pool with tanning ledge and spillover spa built by Savvy Swim"
                  width={1920}
                  height={1280}
                  loading="lazy"
                  className="w-full h-auto"
                />
                <div className="absolute top-4 left-4 inline-flex items-center gap-2 rounded-full glass px-3 py-1.5 text-[10px] uppercase tracking-[0.2em]">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-brand animate-pulse-glow" />
                  Recent build
                </div>

              </div>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-brand mb-3">
                How it goes
              </div>
              <h2 className="text-[2rem] sm:text-[2.6rem] leading-[1.12] font-semibold tracking-tight mb-6">
                See your pool in 3D
                <span className="text-gradient-amber"> before we break ground.</span>
              </h2>
              <p className="text-muted-foreground text-lg leading-relaxed mb-8">
                Every Savvy Swim project starts with a photoreal 3D rendering
                and a full virtual walk-through — so you can change the tile,
                the shape, even the sunset, before a single shovel hits dirt.
              </p>
              <ol className="space-y-5">
                {[
                  { n: "01", t: "Discovery & site survey", d: "Free on-site consult, lot measurement, and budget alignment." },
                  { n: "02", t: "3D design & virtual walk-through", d: "Photoreal renders of your pool, deck, and outdoor living." },
                  { n: "03", t: "Engineering & permits", d: "Structural plans, soil tests, HOA and city permitting handled." },
                  { n: "04", t: "Build & finish", d: "Excavation, gunite, plumbing, tile, plaster — typical 8–12 weeks." },
                  { n: "05", t: "Service for life", d: "Optional weekly maintenance and a 25-year structural warranty." },
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



        </div>
      </section>

      {/* SHOP */}
      <section id="shop" className="py-24 sm:py-32 relative">
        <div className="container-tight">
          <div className="max-w-2xl mb-12">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-brand mb-3">
              The supply room
            </div>
            <h2 className="text-[2rem] sm:text-[2.6rem] leading-[1.12] font-semibold tracking-tight mb-4">
              Pro-grade gear,
              <span className="text-gradient-amber"> contractor pricing.</span>
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed">
              Order equipment and chemicals direct from our warehouse. Every request lands in
              our order system and a specialist confirms stock, final price, and delivery
              before anything is charged. Free local drop-off across DFW.
            </p>
          </div>

          {/* Search + category filters */}
          <div className="mb-8 flex flex-col gap-4">
            <div className="relative max-w-md">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                value={shopQuery}
                onChange={(e) => setShopQuery(e.target.value)}
                placeholder="Search products, SKU, or category…"
                aria-label="Search pool products"
                className="w-full rounded-full border border-border bg-background py-3 pl-11 pr-10 text-sm outline-none transition focus:border-amber-brand"
              />
              {shopQuery && (
                <button
                  type="button"
                  onClick={() => setShopQuery("")}
                  aria-label="Clear search"
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {shopCategories.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {["all", ...shopCategories].map((c) => {
                  const activeChip = shopCategory === c;
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setShopCategory(c)}
                      aria-pressed={activeChip}
                      className={`rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-wider transition ${
                        activeChip
                          ? "border-transparent bg-amber-brand text-primary-foreground shadow-cta"
                          : "border-border text-muted-foreground hover:border-amber-brand hover:text-foreground"
                      }`}
                    >
                      {c === "all" ? "All products" : c}
                    </button>
                  );
                })}
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Showing {visibleProducts.length} of {products.length} products
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {visibleProducts.map((p) => {
              const img = productImage(p);
              const out = p.stock_quantity <= 0;
              return (
                <div key={p.id} className="card-3d rounded-sm overflow-hidden flex flex-col">
                  <div className="relative">
                    <img
                      src={img}
                      alt={`${p.name} — pool supply available from Savvy Swim`}
                      loading="lazy"
                      width={800}
                      height={800}
                      className="aspect-square w-full object-cover"
                    />
                    {p.featured && !out && (
                      <span className="absolute left-3 top-3 rounded-full bg-amber-brand px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">
                        Best seller
                      </span>
                    )}
                    {out && (
                      <span className="absolute left-3 top-3 rounded-full bg-foreground/85 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-background">
                        Backordered
                      </span>
                    )}
                  </div>
                  <div className="p-6 flex flex-col flex-1">
                    <h3 className="font-bold leading-snug">{p.name}</h3>
                    <p className="text-xs text-muted-foreground mt-2 mb-4 leading-relaxed">
                      {p.description}
                    </p>
                    <p className="text-[11px] text-muted-foreground mb-4">
                      SKU {p.sku} ·{" "}
                      {out ? "Ships in 2–3 weeks" : `${p.stock_quantity} in stock`}
                    </p>
                    <div className="mt-auto flex items-center justify-between gap-3">
                      <span className="flex items-baseline gap-2">
                        <span className="text-lg font-bold text-gradient-amber">
                          {money(Number(p.price))}
                        </span>
                        {p.compare_at_price ? (
                          <span className="text-xs text-muted-foreground line-through">
                            {money(Number(p.compare_at_price))}
                          </span>
                        ) : null}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          cart.add({
                            product_id: p.id,
                            name: p.name,
                            sku: p.sku,
                            price: Number(p.price),
                            image: img,
                          })
                        }
                        className="inline-flex items-center gap-1.5 rounded-full bg-amber-brand px-4 py-2 text-xs font-bold uppercase tracking-wider text-primary-foreground shadow-cta hover:brightness-110 transition"
                      >
                        Add <ShoppingCart className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {products.length > 0 && visibleProducts.length === 0 && (
            <div className="rounded-sm border border-border p-10 text-center">
              <p className="font-semibold">No products match your search.</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Try a different keyword or clear the filters.
              </p>
              <button
                type="button"
                onClick={() => {
                  setShopQuery("");
                  setShopCategory("all");
                }}
                className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-amber-brand px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-primary-foreground shadow-cta hover:brightness-110 transition"
              >
                Reset filters
              </button>
            </div>
          )}



          <p className="mt-8 text-sm text-muted-foreground">
            Need something not listed? Call{" "}
            <a href={PHONE_HREF} className="text-amber-brand font-semibold">{PHONE_DISPLAY}</a>{" "}
            — we source pumps, heaters, tile, and automation from every major brand.
          </p>
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

    </div>
  );
};

export default Index;
