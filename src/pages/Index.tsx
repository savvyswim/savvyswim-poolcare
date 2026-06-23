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
} from "lucide-react";
import heroVideo from "@/assets/pool-hero.mp4.asset.json";
import heroPoster from "@/assets/pool-hero.jpg";
import poolDesign from "@/assets/pool-design.jpg";
import poolNight from "@/assets/pool-night.jpg";
import poolService from "@/assets/pool-service.jpg";

const EMAIL = "hi@savagepools.us";
const PHONE_DISPLAY = "(469) 213-8087";
const PHONE_HREF = "tel:+14692138087";

const Index = () => {
  const [scrolled, setScrolled] = useState(false);
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
      {/* NAV */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled ? "bg-ink/80 backdrop-blur-xl border-b border-hairline" : ""
        }`}
      >
        <div className="container-tight flex h-16 items-center justify-between">
          <a href="#" className="flex items-center gap-2.5">
            <div className="relative h-9 w-9 rounded-full bg-amber-brand grid place-items-center shadow-cta">
              <Waves className="h-4.5 w-4.5 text-primary-foreground" />
              <span className="absolute inset-0 rounded-full border border-white/30 animate-ripple" />
            </div>
            <span className="font-bold tracking-tight text-base leading-tight flex flex-col">
              <span>SAVAGE<span className="text-amber-brand">·</span>POOLS</span>
              <span className="text-[9px] font-medium tracking-[0.2em] text-muted-foreground uppercase">Powered by Manor Fix</span>
            </span>
          </a>
          <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#services" className="hover:text-foreground transition">Services</a>
            <a href="#portfolio" className="hover:text-foreground transition">Portfolio</a>
            <a href="#about" className="hover:text-foreground transition">About</a>
            <a href="#contact" className="hover:text-foreground transition">Contact</a>
          </nav>
          <div className="flex items-center gap-2">
            <a
              href={PHONE_HREF}
              className="hidden sm:inline-flex items-center gap-2 rounded-full border border-hairline bg-ink-soft/60 px-3.5 py-2 text-sm font-semibold text-foreground hover:bg-ink-soft transition"
            >
              <Phone className="h-4 w-4 text-amber-brand" /> {PHONE_DISPLAY}
            </a>
            <a
              href={`mailto:${EMAIL}?subject=${encodeURIComponent("Free Pool Quote")}`}
              className="inline-flex items-center gap-2 rounded-full bg-amber-brand px-4 py-2 text-sm font-semibold text-primary-foreground shadow-cta hover:brightness-110 transition"
            >
              Free Quote <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative min-h-[100svh] flex items-end pt-24 pb-16 sm:pb-24 overflow-hidden">
        <div ref={heroRef} className="absolute inset-0 will-change-transform">
          <video
            src={heroVideo.url}
            poster={heroPoster}
            autoPlay
            muted
            loop
            playsInline
            className="absolute inset-0 h-[120%] w-full object-cover"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/20" />
        <div className="absolute inset-0 water-caustics pointer-events-none mix-blend-screen" />
        <div className="absolute inset-0 grid-bg opacity-20" />

        <div className="container-tight relative z-10">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full glass px-3 py-1.5 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground mb-6">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-brand animate-pulse-glow" />
              Design · Build · Service
            </div>
            <h1 className="text-[2.75rem] leading-[0.95] sm:text-6xl lg:text-8xl font-bold tracking-tight">
              <span className="text-gradient-chrome">Backyards,</span>
              <br />
              <span className="text-gradient-amber italic">reimagined.</span>
            </h1>
            <p className="mt-6 text-base sm:text-lg text-foreground/80 max-w-xl leading-relaxed">
              Custom luxury pools, spas, and outdoor living — designed in 3D,
              engineered to last, and serviced for life. Over 600 pools built
              across Texas.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <a
                href={`mailto:${EMAIL}?subject=${encodeURIComponent("Free Pool Quote")}`}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-amber-brand px-7 py-4 text-sm font-semibold text-primary-foreground shadow-cta hover:brightness-110 transition"
              >
                Get a Free 3D Design
                <ArrowRight className="h-4 w-4" />
              </a>
              <a
                href={PHONE_HREF}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-hairline bg-ink-soft/60 backdrop-blur px-7 py-4 text-sm font-semibold text-foreground hover:bg-ink-soft transition"
              >
                <Phone className="h-4 w-4" /> {PHONE_DISPLAY}
              </a>
            </div>

            <div className="mt-12 grid grid-cols-3 gap-4 sm:gap-8 max-w-lg">
              {[
                { k: "600+", v: "Pools built" },
                { k: "4.9★", v: "Avg client rating" },
                { k: "25yr", v: "Structural warranty" },
              ].map((s) => (
                <div key={s.v}>
                  <div className="text-2xl sm:text-3xl font-bold text-gradient-chrome">{s.k}</div>
                  <div className="text-xs text-muted-foreground mt-1">{s.v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Floating water drops */}
        <div className="absolute top-32 right-10 hidden lg:block">
          <div className="relative h-32 w-32 rounded-full bg-amber-brand/10 border border-amber-brand/30 animate-float grid place-items-center">
            <Droplets className="h-8 w-8 text-amber-brand" />
            <span className="absolute inset-0 rounded-full border border-amber-brand/40 animate-ripple" />
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
          <div className="max-w-2xl mb-16">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-brand mb-3">
              / 01 — Services
            </div>
            <h2 className="text-4xl sm:text-5xl font-bold tracking-tight">
              Everything water,
              <span className="text-gradient-amber"> under one roof.</span>
            </h2>
            <p className="mt-4 text-muted-foreground text-lg">
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
              <a
                key={s.title}
                href={`mailto:${EMAIL}?subject=${encodeURIComponent(s.subject)}`}
                title={`Click to request a free quote for ${s.title}`}
                aria-label={`Request a free quote for ${s.title}`}
                className="card-3d rounded-2xl p-6 sm:p-8 tilt-card group flex flex-col cursor-pointer hover:border-amber-brand/50 transition-colors"
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
                  Request Quote
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </a>
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
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-brand mb-3">
                / 02 — Our process
              </div>
              <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-6">
                See your pool in 3D
                <span className="text-gradient-amber"> before we break ground.</span>
              </h2>
              <p className="text-muted-foreground text-lg leading-relaxed mb-8">
                Every Savage Pools project starts with a photoreal 3D rendering
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

      {/* PORTFOLIO */}
      <section id="portfolio" className="py-24 sm:py-32 relative">
        <div className="container-tight">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
            <div className="max-w-xl">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-brand mb-3">
                / 03 — Recent builds
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
      <section className="py-24 sm:py-32 relative bg-ink/40 border-y border-hairline">
        <div className="container-tight">
          <div className="max-w-2xl mb-12">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-brand mb-3">
              / 04 — Clients
            </div>
            <h2 className="text-4xl sm:text-5xl font-bold tracking-tight">
              Loved by neighbors
              <span className="text-gradient-amber"> across Texas.</span>
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { q: "The 3D design sold us instantly — what we saw on screen is exactly what we got in the backyard.", a: "Megan R.", c: "Austin, TX" },
              { q: "Crew was on time, on budget, and the spa is unreal at night. Best decision we made for our home.", a: "Daniel K.", c: "Dallas, TX" },
              { q: "Weekly service is flawless. I haven't touched a chemical in two years and the water looks like glass.", a: "Priya S.", c: "Houston, TX" },
            ].map((t) => (
              <div key={t.a} className="card-3d rounded-2xl p-7">
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-amber-brand text-amber-brand" />
                  ))}
                </div>
                <p className="text-foreground/90 leading-relaxed mb-6">"{t.q}"</p>
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
        </div>
      </section>

      {/* ABOUT */}
      <section id="about" className="py-24 sm:py-32 relative">
        <div className="container-tight">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-brand mb-3">
                / 05 — Why Savage Pools
              </div>
              <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-6">
                Builders, not brokers —
                <span className="text-gradient-amber"> in-house from dig to dive.</span>
              </h2>
              <p className="text-muted-foreground text-lg leading-relaxed mb-8">
                We don't sub out the hard parts. Savage Pools owns excavation,
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
                    <div className="font-bold">Savage Pools</div>
                    <div className="text-xs text-muted-foreground">Design · Build · Service</div>
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
                <a
                  href={`mailto:${EMAIL}?subject=${encodeURIComponent("Free 3D Pool Design")}`}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-amber-brand px-7 py-4 text-sm font-semibold text-primary-foreground shadow-cta hover:brightness-110 transition"
                >
                  <Mail className="h-4 w-4" /> Get my free 3D design
                </a>
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
            <span>© {new Date().getFullYear()} Savage Pools. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-5">
            <a href={`mailto:${EMAIL}`} className="hover:text-foreground transition">{EMAIL}</a>
            <a href={PHONE_HREF} className="hover:text-foreground transition">{PHONE_DISPLAY}</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
