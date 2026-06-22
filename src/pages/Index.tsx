import { useEffect, useState } from "react";
import {
  Mail,
  Shield,
  Truck,
  PackageCheck,
  Factory,
  Award,
  ArrowRight,
  CheckCircle2,
  Zap,
  Globe,
  Clock,
  Star,
} from "lucide-react";
import heroVideo from "@/assets/hero-savage.mp4.asset.json";
import heroPoster from "@/assets/hero-poster.jpg";
import emblem from "@/assets/savage-emblem.png";
import product1 from "@/assets/product-1.jpg";
import product2 from "@/assets/product-2.jpg";
import product3 from "@/assets/product-3.jpg";

const EMAIL = "hi@savagesupplies.us";

const Index = () => {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
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
            <img src={emblem} alt="" width={32} height={32} className="h-8 w-8 drop-shadow-[0_4px_12px_hsl(22_95%_55%/0.5)]" />
            <span className="font-bold tracking-tight text-base">
              SAVAGE<span className="text-amber-brand">.</span>SUPPLIES
            </span>
          </a>
          <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#services" className="hover:text-foreground transition">Services</a>
            <a href="#catalog" className="hover:text-foreground transition">Catalog</a>
            <a href="#about" className="hover:text-foreground transition">About</a>
            <a href="#contact" className="hover:text-foreground transition">Contact</a>
          </nav>
          <a
            href={`mailto:${EMAIL}`}
            className="hidden sm:inline-flex items-center gap-2 rounded-sm bg-amber-brand px-4 py-2 text-sm font-semibold text-primary-foreground shadow-cta hover:brightness-110 transition"
          >
            Request Quote <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </header>

      {/* HERO */}
      <section className="relative min-h-[100svh] flex items-end pt-24 pb-16 sm:pb-24 overflow-hidden">
        <video
          src={heroVideo.url}
          poster={heroPoster}
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/85 to-background/40" />
        <div className="absolute inset-0 grid-bg opacity-30" />

        <div className="container-tight relative z-10">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full glass px-3 py-1.5 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground mb-6">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-brand animate-pulse-glow" />
              Industrial Supply · Logistics · Service
            </div>
            <h1 className="text-[2.75rem] leading-[0.95] sm:text-6xl lg:text-7xl font-bold tracking-tight">
              <span className="text-gradient-chrome">Engineered</span>
              <br />
              <span className="text-gradient-amber">Supply Solutions.</span>
            </h1>
            <p className="mt-6 text-base sm:text-lg text-muted-foreground max-w-xl leading-relaxed">
              Premium industrial supplies, tools, and turnkey procurement
              services for contractors, fleets, and enterprise operations
              nationwide.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <a
                href={`mailto:${EMAIL}`}
                className="inline-flex items-center justify-center gap-2 rounded-sm bg-amber-brand px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-cta hover:brightness-110 transition"
              >
                Request a Quote <ArrowRight className="h-4 w-4" />
              </a>
              <a
                href="#catalog"
                className="inline-flex items-center justify-center gap-2 rounded-sm border border-hairline bg-ink-soft/60 backdrop-blur px-6 py-3.5 text-sm font-semibold text-foreground hover:bg-ink-soft transition"
              >
                View Catalog
              </a>
            </div>

            {/* Floating stats */}
            <div className="mt-12 grid grid-cols-3 gap-4 sm:gap-8 max-w-lg">
              {[
                { k: "12K+", v: "SKUs in stock" },
                { k: "48hr", v: "Avg fulfillment" },
                { k: "98%", v: "On-time delivery" },
              ].map((s) => (
                <div key={s.v}>
                  <div className="text-2xl sm:text-3xl font-bold text-gradient-chrome">{s.k}</div>
                  <div className="text-xs text-muted-foreground mt-1">{s.v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* MARQUEE */}
      <section className="border-y border-hairline bg-ink/50 py-6 overflow-hidden">
        <div className="flex animate-marquee gap-12 whitespace-nowrap text-sm uppercase tracking-[0.2em] text-muted-foreground">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="flex gap-12 items-center shrink-0">
              <span>ISO 9001 Certified</span><span className="text-amber-brand">◆</span>
              <span>OSHA Compliant</span><span className="text-amber-brand">◆</span>
              <span>Net-30 Terms Available</span><span className="text-amber-brand">◆</span>
              <span>Nationwide Logistics</span><span className="text-amber-brand">◆</span>
              <span>Bulk & Wholesale</span><span className="text-amber-brand">◆</span>
              <span>24/7 Support</span><span className="text-amber-brand">◆</span>
            </div>
          ))}
        </div>
      </section>

      {/* SERVICES */}
      <section id="services" className="py-24 sm:py-32 relative">
        <div className="container-tight">
          <div className="max-w-2xl mb-16">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-brand mb-3">
              / 01 — What we do
            </div>
            <h2 className="text-4xl sm:text-5xl font-bold tracking-tight">
              Full-spectrum supply chain,
              <span className="text-gradient-amber"> handled.</span>
            </h2>
            <p className="mt-4 text-muted-foreground text-lg">
              From single-SKU procurement to enterprise-wide MRO programs.
              One vendor. Zero friction.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: Factory, title: "Industrial Procurement", desc: "Tools, safety gear, hardware, and MRO consumables — sourced and delivered at scale." },
              { icon: Truck, title: "Logistics & Freight", desc: "LTL, FTL, and last-mile delivery across the continental US with real-time tracking." },
              { icon: PackageCheck, title: "Inventory Management", desc: "Vendor-managed inventory programs that keep your floors stocked and your books clean." },
              { icon: Shield, title: "Safety Compliance", desc: "OSHA-compliant PPE programs, audits, and training documentation for your crew." },
              { icon: Zap, title: "Emergency Response", desc: "Same-day fulfillment on critical SKUs. We answer when production is on the line." },
              { icon: Globe, title: "Custom Sourcing", desc: "Can't find it? We will. Global supplier network with vetted partners on six continents." },
            ].map((s, i) => (
              <div
                key={s.title}
                className="card-3d rounded-md p-6 sm:p-8 hover:translate-y-[-2px] transition-transform duration-300 group"
              >
                <div className="flex items-start justify-between mb-6">
                  <div className="h-12 w-12 rounded-sm bg-amber-brand/10 border border-amber-brand/30 flex items-center justify-center group-hover:bg-amber-brand/20 transition">
                    <s.icon className="h-5 w-5 text-amber-brand" />
                  </div>
                  <span className="text-xs font-mono text-muted-foreground">0{i + 1}</span>
                </div>
                <h3 className="text-xl font-semibold mb-2">{s.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CATALOG / 3D Product showcase */}
      <section id="catalog" className="py-24 sm:py-32 relative bg-ink/40 border-y border-hairline">
        <div className="container-tight">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
            <div className="max-w-xl">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-brand mb-3">
                / 02 — Catalog
              </div>
              <h2 className="text-4xl sm:text-5xl font-bold tracking-tight">
                Built to spec.
                <br />
                <span className="text-gradient-chrome">Stocked to perform.</span>
              </h2>
            </div>
            <a href={`mailto:${EMAIL}`} className="inline-flex items-center gap-2 text-sm font-semibold text-amber-brand hover:gap-3 transition-all">
              Browse full catalog <ArrowRight className="h-4 w-4" />
            </a>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { img: product1, cat: "Tools", title: "Precision Hand Tools", count: "320+ SKUs" },
              { img: product2, cat: "Safety", title: "PPE & Head Protection", count: "180+ SKUs" },
              { img: product3, cat: "Workwear", title: "Industrial Gloves & Gear", count: "240+ SKUs" },
            ].map((p) => (
              <div key={p.title} className="card-3d rounded-md overflow-hidden group">
                <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-ink-soft to-ink">
                  <img
                    src={p.img}
                    alt={p.title}
                    loading="lazy"
                    width={800}
                    height={800}
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute top-4 left-4 rounded-full glass px-3 py-1 text-[10px] uppercase tracking-[0.18em]">
                    {p.cat}
                  </div>
                </div>
                <div className="p-5 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">{p.title}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{p.count}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-amber-brand opacity-0 group-hover:opacity-100 transition" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ABOUT / STATS BAND */}
      <section id="about" className="py-24 sm:py-32 relative">
        <div className="container-tight">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-brand mb-3">
                / 03 — Why Savage
              </div>
              <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-6">
                Engineered like the machines
                <span className="text-gradient-amber"> we supply.</span>
              </h2>
              <p className="text-muted-foreground text-lg leading-relaxed mb-8">
                Savage Supplies is a vertically-integrated supply partner trusted
                by general contractors, manufacturing operators, and Fortune 500
                facility teams. We don't just ship boxes — we engineer reliable
                supply chains.
              </p>
              <ul className="space-y-3">
                {[
                  "Dedicated account engineer assigned on day one",
                  "Transparent margins, audited invoicing",
                  "Net-30 terms for qualified accounts",
                  "Custom kitting & branded packaging available",
                ].map((b) => (
                  <li key={b} className="flex items-start gap-3 text-sm">
                    <CheckCircle2 className="h-5 w-5 text-amber-brand flex-shrink-0 mt-0.5" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="relative">
              <div className="absolute -inset-8 bg-gradient-radial opacity-60 blur-3xl" />
              <div className="relative card-3d rounded-lg p-8 shadow-3d">
                <div className="flex items-center gap-3 mb-6">
                  <img src={emblem} alt="" width={48} height={48} className="h-12 w-12 animate-float" />
                  <div>
                    <div className="font-bold">Savage Supplies</div>
                    <div className="text-xs text-muted-foreground">Est. operations · US-based</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-px bg-hairline">
                  {[
                    { k: "12,000+", v: "Active SKUs", icon: PackageCheck },
                    { k: "48 States", v: "Service area", icon: Globe },
                    { k: "24/7", v: "Account support", icon: Clock },
                    { k: "A+", v: "Vendor rating", icon: Award },
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
                  <span className="ml-2">Trusted by 500+ enterprise accounts</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="contact" className="py-24 sm:py-32 relative">
        <div className="container-tight">
          <div className="relative rounded-lg overflow-hidden card-3d p-10 sm:p-16 text-center shadow-3d">
            <div className="absolute inset-0 bg-gradient-radial opacity-80" />
            <div className="absolute inset-0 grid-bg opacity-20" />
            <div className="relative">
              <img src={emblem} alt="" width={64} height={64} className="h-16 w-16 mx-auto mb-6 animate-float" />
              <h2 className="text-4xl sm:text-6xl font-bold tracking-tight mb-4">
                Let's build your
                <span className="text-gradient-amber"> supply program.</span>
              </h2>
              <p className="text-muted-foreground text-lg max-w-xl mx-auto mb-8">
                Request a quote, schedule a procurement consult, or talk to an account engineer today.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <a
                  href={`mailto:${EMAIL}`}
                  className="inline-flex items-center justify-center gap-2 rounded-sm bg-amber-brand px-7 py-4 text-sm font-semibold text-primary-foreground shadow-cta hover:brightness-110 transition"
                >
                  <Mail className="h-4 w-4" /> {EMAIL}
                </a>
                <a
                  href="#catalog"
                  className="inline-flex items-center justify-center gap-2 rounded-sm border border-hairline bg-ink-soft/60 px-7 py-4 text-sm font-semibold hover:bg-ink-soft transition"
                >
                  Explore catalog
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-hairline py-10">
        <div className="container-tight flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <img src={emblem} alt="" width={24} height={24} className="h-6 w-6" />
            <span>© {new Date().getFullYear()} Savage Supplies. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-6">
            <a href={`mailto:${EMAIL}`} className="hover:text-foreground transition">{EMAIL}</a>
            <span>savagesupplies.us</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
