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
} from "lucide-react";
import heroVideo from "@/assets/pool-hero.mp4.asset.json";
import heroPoster from "@/assets/pool-hero.jpg";
import poolDesign from "@/assets/pool-design.jpg";
import poolNight from "@/assets/pool-night.jpg";
import poolService from "@/assets/pool-service.jpg";
import { BookingDialog } from "@/components/BookingDialog";
import { CursorFollower } from "@/components/CursorFollower";
import { SmoothLoopVideo } from "@/components/SmoothLoopVideo";
import { OrderDialog, type OrderItem } from "@/components/OrderDialog";
import shopRobot from "@/assets/shop-robot-cleaner.jpg";
import shopChemicals from "@/assets/shop-chemicals.jpg";
import shopPump from "@/assets/shop-pump.jpg";
import shopTools from "@/assets/shop-tools.jpg";


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


const CLEANING_PLANS = [
  {
    name: "Essential Clean",
    price: "$149",
    cadence: "/ month",
    blurb: "Bi-weekly visits for low-traffic backyards.",
    items: ["2 visits per month", "Skim, brush & vacuum", "Basket & skimmer cleanout", "Water chemistry balance", "Digital service report"],
  },
  {
    name: "Weekly Crystal",
    price: "$219",
    cadence: "/ month",
    blurb: "Our most popular DFW weekly service.",
    items: ["4 visits per month", "Full chemical package included", "Filter pressure check", "Equipment inspection each visit", "Photo report after every clean", "Priority scheduling"],
    featured: true,
  },
  {
    name: "Total Care",
    price: "$349",
    cadence: "/ month",
    blurb: "Hands-off ownership, pool always guest-ready.",
    items: ["4 visits + on-call touch-ups", "Chemicals, salt & tabs included", "Quarterly filter deep clean", "Free minor equipment repairs", "Seasonal open/close service", "24/7 text support"],
  },
];

const SHOP_PRODUCTS = [
  { name: "AquaGlide Robotic Cleaner", sku: "SS-ROB-01", price: 899, img: shopRobot, blurb: "Cordless robot that scrubs floor, walls, and waterline in 90 minutes." },
  { name: "Crystal Chem Season Kit", sku: "SS-CHEM-04", price: 189, img: shopChemicals, blurb: "Chlorine tabs, shock, algaecide, clarifier, and a pro test kit." },
  { name: "Variable-Speed Pump 1.65HP", sku: "SS-PMP-165", price: 1149, img: shopPump, blurb: "Energy-saving pump that typically cuts pool power bills by half." },
  { name: "Pro Maintenance Tool Set", sku: "SS-TOOL-07", price: 129, img: shopTools, blurb: "Telescopic pole, leaf rake, vacuum head, and wall brush." },
];

const Index = () => {
  const [scrolled, setScrolled] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookingService, setBookingService] = useState<string | undefined>(undefined);
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
      <CursorFollower />
      {/* NAV */}
      <header className="fixed top-0 left-0 right-0 z-50">
        {/* Utility bar */}
        <div className="topbar hidden md:block text-[13px]">
          <div className="container-tight flex h-9 items-center justify-end gap-6">
            <a href="#cleaning" className="hover:opacity-80 transition">Pool Cleaning</a>
            <a href="#shop" className="hover:opacity-80 transition">Shop</a>
            <a href="/privacy-policy" className="hover:opacity-80 transition">Warranty &amp; Privacy</a>
            <span className="font-semibold">Sales: {PHONE_DISPLAY}</span>
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
              <a href="#services" className="hover:text-primary transition">Residential</a>
              <a href="#cleaning" className="hover:text-primary transition">Pool Care</a>
              <a href="#shop" className="hover:text-primary transition">Shop</a>
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
      <section className="relative min-h-[100svh] flex items-center pt-32 pb-20 overflow-hidden">
        <div ref={heroRef} className="absolute inset-0 will-change-transform">
          <div className="absolute inset-0 h-[120%] w-full">
            <SmoothLoopVideo src={heroVideo.url} poster={heroPoster} fade={1.4} />
          </div>
        </div>
        <div className="absolute inset-0 hero-scrim" />

        <div className="container-tight relative z-10">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 border-l-2 border-accent pl-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-on-media mb-6">
              Family-run in DFW since 2009
            </div>
            <h1 className="text-on-media text-[2.4rem] leading-[1.08] sm:text-[3.25rem] lg:text-[3.75rem] font-semibold tracking-tight">
              North Texas&rsquo; award-winning
              <br className="hidden sm:block" /> luxury pool builder
            </h1>
            <p className="text-on-media mt-6 max-w-xl text-[15px] sm:text-base leading-relaxed opacity-90">
              Custom gunite pools, spas and outdoor living across Dallas–Fort Worth.
              You&rsquo;ll have our cell number, meet the crew pouring your shell, and
              swim in it for decades — 600+ backyards later, we still answer the phone ourselves.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => openBooking("Custom Pool Design & Build")}
                className="btn-quote inline-flex items-center justify-center gap-2 rounded-sm px-7 py-3.5 text-[13px] font-semibold uppercase tracking-[0.1em] transition"
              >
                <CalendarCheck className="h-4 w-4" />
                Free Design Consultation
              </button>
              <a
                href={PHONE_HREF}
                className="inline-flex items-center justify-center gap-2 rounded-sm border border-white/40 px-7 py-3.5 text-[13px] font-semibold uppercase tracking-[0.1em] text-on-media hover:bg-white/10 transition"
              >
                <Phone className="h-4 w-4" /> {PHONE_DISPLAY}
              </a>
            </div>

            <div className="mt-14 grid max-w-lg grid-cols-3 gap-6 border-t border-white/20 pt-6">
              {[
                { k: "600+", v: "Pools built" },
                { k: "4.9★", v: "Avg client rating" },
                { k: "25yr", v: "Structural warranty" },
              ].map((s) => (
                <div key={s.v}>
                  <div className="text-on-media text-2xl sm:text-[2rem] font-semibold">{s.k}</div>
                  <div className="text-on-media mt-1 text-[10px] uppercase tracking-[0.18em] opacity-75">{s.v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

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
                className="text-left card-3d rounded-2xl p-6 sm:p-8 tilt-card group flex flex-col cursor-pointer hover:border-amber-brand/50 transition-colors"
              >
                <div className="flex items-start justify-between mb-6">
                  <div className="h-12 w-12 rounded-xl bg-amber-brand/10 border border-amber-brand/30 flex items-center justify-center group-hover:bg-amber-brand/20 transition">
                    <s.icon className="h-5 w-5 text-amber-brand" />
                  </div>
                  <span className="text-xs font-mono text-muted-foreground">0{i + 1}</span>
                </div>
                <h3 className="text-xl font-semibold mb-2">{s.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>

                <div className="my-5 h-px bg-hairline" />

                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-3">
                  What's included
                </div>
                <ul className="space-y-2 mb-6">
                  {s.includes.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-amber-brand flex-shrink-0 mt-0.5" />
                      <span className="text-foreground/90">{item}</span>
                    </li>
                  ))}
                </ul>

                <span
                  className="mt-auto inline-flex items-center justify-between gap-2 rounded-full border border-hairline bg-ink-soft/60 px-4 py-3 text-sm font-semibold text-foreground group-hover:bg-amber-brand group-hover:text-primary-foreground group-hover:border-amber-brand transition"
                >
                  <span className="inline-flex items-center gap-2"><CalendarCheck className="h-4 w-4" /> Book Free Quote</span>
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
              <div className="relative rounded-3xl overflow-hidden shadow-3d border border-hairline">
                <img
                  src={poolDesign}
                  alt="3D rendered pool with glass mosaic tile and waterfall"
                  width={1024}
                  height={1024}
                  loading="lazy"
                  className="w-full h-auto"
                />
                <div className="absolute top-4 left-4 inline-flex items-center gap-2 rounded-full glass px-3 py-1.5 text-[10px] uppercase tracking-[0.2em]">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-brand animate-pulse-glow" />
                  3D Preview
                </div>
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-brand mb-3">
                How it goes
              </div>
              <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-6">
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
            <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
              Weekly cleaning
              <span className="text-gradient-amber"> across DFW.</span>
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed">
              Licensed, insured techs. Chemicals included. Every visit ends with a photo
              report in your inbox — no guessing, no surprise invoices.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {CLEANING_PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`card-3d rounded-2xl p-7 flex flex-col ${
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
                  <span className="text-4xl font-bold text-gradient-amber">{plan.price}</span>
                  <span className="text-sm text-muted-foreground mb-1">{plan.cadence}</span>
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
                  onClick={() =>
                    openOrder({ name: `${plan.name} cleaning plan`, sku: plan.name, type: "cleaning_plan" })
                  }
                  className="mt-auto inline-flex items-center justify-center gap-2 rounded-full bg-amber-brand px-5 py-3 text-sm font-semibold text-primary-foreground shadow-cta hover:brightness-110 transition"
                >
                  Start this plan <ArrowRight className="h-4 w-4" />
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
            <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
              Pro-grade gear,
              <span className="text-gradient-amber"> contractor pricing.</span>
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed">
              Order equipment and chemicals direct from our warehouse. Every request lands in
              our order system and a specialist confirms stock, final price, and delivery
              before anything is charged. Free local drop-off across DFW.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {SHOP_PRODUCTS.map((p) => (
              <div key={p.sku} className="card-3d rounded-2xl overflow-hidden flex flex-col">
                <img
                  src={p.img}
                  alt={`${p.name} — pool supply available from Savvy Swim`}
                  loading="lazy"
                  width={800}
                  height={800}
                  className="aspect-square w-full object-cover"
                />
                <div className="p-6 flex flex-col flex-1">
                  <h3 className="font-bold leading-snug">{p.name}</h3>
                  <p className="text-xs text-muted-foreground mt-2 mb-5 leading-relaxed">{p.blurb}</p>
                  <div className="mt-auto flex items-center justify-between gap-3">
                    <span className="text-lg font-bold text-gradient-amber">${p.price}</span>
                    <button
                      type="button"
                      onClick={() =>
                        openOrder({ name: p.name, sku: p.sku, price: p.price, type: "product" })
                      }
                      className="inline-flex items-center gap-1.5 rounded-full bg-amber-brand px-4 py-2 text-xs font-bold uppercase tracking-wider text-primary-foreground shadow-cta hover:brightness-110 transition"
                    >
                      Order <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

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
              <h2 className="text-4xl sm:text-5xl font-bold tracking-tight">
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
              { img: heroPoster, tag: "Infinity Edge", title: "Hillside Sunset", desc: "60-ft vanishing edge with glass mosaic and travertine deck, overlooking Austin hill country.", metric: "60 ft · gunite · 3D designed" },
              { img: poolNight, tag: "Spa & Fire", title: "Night Lounge", desc: "Color-changing LEDs, spillover spa, and six bronze fire bowls — built for entertaining after dark.", metric: "6 fire features · automation" },
              { img: poolService, tag: "Lap & Wellness", title: "Modern Lap", desc: "65-ft lap lane with pebble finish, salt system, and weekly white-glove service.", metric: "65 ft · salt · serviced weekly" },
            ].map((p) => (
              <a
                key={p.title}
                href={`mailto:${EMAIL}?subject=${encodeURIComponent(`Project inquiry — ${p.title}`)}`}
                title={`Click to ask about a ${p.tag.toLowerCase()} build like ${p.title}`}
                aria-label={`Inquire about ${p.title}`}
                className="card-3d rounded-2xl overflow-hidden group tilt-card flex flex-col cursor-pointer hover:border-amber-brand/50 transition-colors"
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
                  <h3 className="text-2xl font-bold mb-2 text-gradient-amber">{p.title}</h3>
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
            <h2 className="text-4xl sm:text-5xl font-bold tracking-tight">
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
                  className="card-3d rounded-2xl p-6 w-[330px] sm:w-[380px] shrink-0"
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
              <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-6">
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
              <div className="relative card-3d rounded-3xl p-8 shadow-3d">
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
                <div className="grid grid-cols-2 gap-px bg-hairline rounded-2xl overflow-hidden">
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
          <div className="relative rounded-3xl overflow-hidden card-3d p-10 sm:p-16 text-center shadow-3d">
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
              <h2 className="text-4xl sm:text-6xl font-bold tracking-tight mb-4">
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

    </div>
  );
};

export default Index;
