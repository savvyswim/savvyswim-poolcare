import { useEffect, useState } from "react";
import {
  Mail,
  Phone,
  Shield,
  TrendingUp,
  Target,
  Rocket,
  Award,
  ArrowRight,
  CheckCircle2,
  LineChart,
  Globe,
  Clock,
  Star,
  Handshake,
  DollarSign,
  Briefcase,
} from "lucide-react";
import heroVideo from "@/assets/hero-savage.mp4.asset.json";
import heroPoster from "@/assets/hero-poster.jpg";
import emblem from "@/assets/savage-emblem.png";

const EMAIL = "hi@savagesupplies.us";
const PHONE_DISPLAY = "(469) 213-8087";
const PHONE_HREF = "tel:+14692138087";

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
              SAVAGE<span className="text-amber-brand">.</span>GROWTH
            </span>
          </a>
          <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#services" className="hover:text-foreground transition">Services</a>
            <a href="#results" className="hover:text-foreground transition">Results</a>
            <a href="#about" className="hover:text-foreground transition">About</a>
            <a href="#contact" className="hover:text-foreground transition">Contact</a>
          </nav>
          <div className="flex items-center gap-2">
            <a
              href={PHONE_HREF}
              className="hidden sm:inline-flex items-center gap-2 rounded-sm border border-hairline bg-ink-soft/60 px-3.5 py-2 text-sm font-semibold text-foreground hover:bg-ink-soft transition"
            >
              <Phone className="h-4 w-4 text-amber-brand" /> {PHONE_DISPLAY}
            </a>
            <a
              href={`mailto:${EMAIL}?subject=${encodeURIComponent("Strategy Call Request")}`}
              className="hidden sm:inline-flex items-center gap-2 rounded-sm bg-amber-brand px-4 py-2 text-sm font-semibold text-primary-foreground shadow-cta hover:brightness-110 transition"
            >
              Book Strategy Call <ArrowRight className="h-4 w-4" />
            </a>
          </div>
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
              Growth · Capital · Exit Advisory
            </div>
            <h1 className="text-[2.75rem] leading-[0.95] sm:text-6xl lg:text-7xl font-bold tracking-tight">
              <span className="text-gradient-chrome">We grow companies.</span>
              <br />
              <span className="text-gradient-amber">In any market.</span>
            </h1>
            <p className="mt-6 text-base sm:text-lg text-muted-foreground max-w-xl leading-relaxed">
              We build the strategy that takes your company from stuck to sold,
              scaled, or funded. 100+ companies sold or backed by investors
              under our advisory.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <a
                href={PHONE_HREF}
                className="inline-flex items-center justify-center gap-2 rounded-sm bg-amber-brand px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-cta hover:brightness-110 transition"
              >
                <Phone className="h-4 w-4" /> {PHONE_DISPLAY}
              </a>
              <a
                href={`mailto:${EMAIL}?subject=${encodeURIComponent("Strategy Call Request")}`}
                className="inline-flex items-center justify-center gap-2 rounded-sm border border-hairline bg-ink-soft/60 backdrop-blur px-6 py-3.5 text-sm font-semibold text-foreground hover:bg-ink-soft transition"
              >
                Book a Strategy Call <ArrowRight className="h-4 w-4" />
              </a>
            </div>

            {/* Floating stats */}
            <div className="mt-12 grid grid-cols-3 gap-4 sm:gap-8 max-w-lg">
              {[
                { k: "100+", v: "Companies sold or funded" },
                { k: "$420M", v: "Capital & exits closed" },
                { k: "18+", v: "Industries served" },
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
              <span>SaaS</span><span className="text-amber-brand">◆</span>
              <span>E-Commerce</span><span className="text-amber-brand">◆</span>
              <span>Industrial & Services</span><span className="text-amber-brand">◆</span>
              <span>Healthcare</span><span className="text-amber-brand">◆</span>
              <span>Real Estate</span><span className="text-amber-brand">◆</span>
              <span>Consumer Brands</span><span className="text-amber-brand">◆</span>
              <span>Fintech</span><span className="text-amber-brand">◆</span>
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
              A strategy built for
              <span className="text-gradient-amber"> your next milestone.</span>
            </h2>
            <p className="mt-4 text-muted-foreground text-lg">
              Whether you're scaling revenue, raising capital, or preparing for
              an exit — we engineer the playbook and execute it with you.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {
                icon: TrendingUp,
                title: "Growth Strategy",
                desc: "A 90-day operating plan to unlock revenue and tighten unit economics.",
                includes: [
                  "Market & competitor diagnostic",
                  "GTM & pricing strategy",
                  "Revenue model rebuild",
                  "90-day execution roadmap",
                ],
                subject: "Quote — Growth Strategy",
              },
              {
                icon: DollarSign,
                title: "Investor Readiness",
                desc: "Get fundable. Pitch deck, financials, and warm intros to capital.",
                includes: [
                  "Investor-grade pitch deck",
                  "Financial model & projections",
                  "Data room build-out",
                  "Warm intros to our VC & PE network",
                ],
                subject: "Quote — Investor Readiness",
              },
              {
                icon: Handshake,
                title: "M&A / Exit Advisory",
                desc: "Position, value, and sell your company to the right strategic buyer.",
                includes: [
                  "Valuation & buyer mapping",
                  "Confidential outreach",
                  "Negotiation & deal terms",
                  "End-to-end closing support",
                ],
                subject: "Quote — M&A / Exit",
              },
              {
                icon: Globe,
                title: "Market Expansion",
                desc: "Enter new geos, verticals, or channels without burning runway.",
                includes: [
                  "Market sizing & entry plan",
                  "Channel & partner strategy",
                  "Local ops & hiring playbook",
                  "Risk & compliance review",
                ],
                subject: "Quote — Market Expansion",
              },
              {
                icon: Target,
                title: "Brand & Positioning",
                desc: "Sharpen your story so customers, talent, and investors lean in.",
                includes: [
                  "Brand & messaging audit",
                  "Category positioning",
                  "Website & sales narrative",
                  "Founder & PR strategy",
                ],
                subject: "Quote — Brand & Positioning",
              },
              {
                icon: Rocket,
                title: "Sales Acceleration",
                desc: "Build a repeatable sales engine that hits target every quarter.",
                includes: [
                  "Outbound & inbound playbooks",
                  "CRM & pipeline setup",
                  "Comp plan & quota design",
                  "Sales hiring & coaching",
                ],
                subject: "Quote — Sales Acceleration",
              },
            ].map((s, i) => (
              <div
                key={s.title}
                className="card-3d rounded-md p-6 sm:p-8 hover:translate-y-[-2px] transition-transform duration-300 group flex flex-col"
              >
                <div className="flex items-start justify-between mb-6">
                  <div className="h-12 w-12 rounded-sm bg-amber-brand/10 border border-amber-brand/30 flex items-center justify-center group-hover:bg-amber-brand/20 transition">
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

                <a
                  href={`mailto:${EMAIL}?subject=${encodeURIComponent(s.subject)}`}
                  className="mt-auto inline-flex items-center justify-between gap-2 rounded-sm border border-hairline bg-ink-soft/60 px-4 py-3 text-sm font-semibold text-foreground hover:bg-amber-brand hover:text-primary-foreground hover:border-amber-brand transition group/cta"
                >
                  Request strategy
                  <ArrowRight className="h-4 w-4 transition-transform group-hover/cta:translate-x-0.5" />
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* RESULTS */}
      <section id="results" className="py-24 sm:py-32 relative bg-ink/40 border-y border-hairline">
        <div className="container-tight">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
            <div className="max-w-xl">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-brand mb-3">
                / 02 — Results
              </div>
              <h2 className="text-4xl sm:text-5xl font-bold tracking-tight">
                Strategy that
                <br />
                <span className="text-gradient-chrome">closes deals.</span>
              </h2>
            </div>
            <a href={`mailto:${EMAIL}?subject=${encodeURIComponent("Send full case studies")}`} className="inline-flex items-center gap-2 text-sm font-semibold text-amber-brand hover:gap-3 transition-all">
              Request full case studies <ArrowRight className="h-4 w-4" />
            </a>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { tag: "SaaS", title: "$18M Series A", desc: "Repositioned an early-stage SaaS, built investor deck, and closed Series A in 11 weeks.", metric: "11 weeks to term sheet" },
              { tag: "E-Commerce", title: "9-figure exit", desc: "Advised DTC brand on positioning, EBITDA cleanup, and buyer outreach — closed strategic acquisition.", metric: "6.4x EBITDA multiple" },
              { tag: "Services", title: "3.2x revenue in 12 mo", desc: "Built outbound engine and pricing rebuild for B2B services firm — tripled ARR within a year.", metric: "+220% net new revenue" },
            ].map((p) => (
              <div key={p.title} className="card-3d rounded-md p-6 sm:p-8 group flex flex-col">
                <div className="inline-flex w-fit rounded-full glass px-3 py-1 text-[10px] uppercase tracking-[0.18em] mb-6">
                  {p.tag}
                </div>
                <h3 className="text-2xl font-bold mb-3 text-gradient-amber">{p.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-6">{p.desc}</p>
                <div className="mt-auto pt-5 border-t border-hairline flex items-center justify-between">
                  <span className="text-xs font-mono text-foreground/80">{p.metric}</span>
                  <ArrowRight className="h-4 w-4 text-amber-brand opacity-60 group-hover:opacity-100 transition" />
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
                / 03 — Why Savage Growth
              </div>
              <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-6">
                Operators and dealmakers —
                <span className="text-gradient-amber"> not just consultants.</span>
              </h2>
              <p className="text-muted-foreground text-lg leading-relaxed mb-8">
                Savage Growth Partners is led by founders, former investors, and
                M&A advisors who have personally built, sold, and funded
                companies. We don't hand you a slide deck — we sit on your side
                of the table until the deal is signed.
              </p>
              <ul className="space-y-3">
                {[
                  "Senior partner on every engagement — no junior hand-offs",
                  "Fixed scopes and transparent fees, with performance upside",
                  "Direct access to our 400+ investor and acquirer network",
                  "Industry-agnostic: we've operated across 18+ verticals",
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
                    <div className="font-bold">Savage Growth Partners</div>
                    <div className="text-xs text-muted-foreground">Strategy · Capital · Exits</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-px bg-hairline">
                  {[
                    { k: "100+", v: "Companies advised", icon: Briefcase },
                    { k: "$420M", v: "Closed deal value", icon: LineChart },
                    { k: "400+", v: "Investor network", icon: Handshake },
                    { k: "A+", v: "Founder NPS", icon: Award },
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
                  <span className="ml-2">Trusted by founders, boards, and operators</span>
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
                <span className="text-gradient-amber"> growth strategy.</span>
              </h2>
              <p className="text-muted-foreground text-lg max-w-xl mx-auto mb-8">
                Book a confidential 30-minute strategy call. We'll diagnose
                where you're stuck and outline the path to your next milestone —
                no pitch, no fluff.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <a
                  href={PHONE_HREF}
                  className="inline-flex items-center justify-center gap-2 rounded-sm bg-amber-brand px-7 py-4 text-sm font-semibold text-primary-foreground shadow-cta hover:brightness-110 transition"
                >
                  <Phone className="h-4 w-4" /> {PHONE_DISPLAY}
                </a>
                <a
                  href={`mailto:${EMAIL}?subject=${encodeURIComponent("Strategy Call Request")}`}
                  className="inline-flex items-center justify-center gap-2 rounded-sm border border-hairline bg-ink-soft/60 px-7 py-4 text-sm font-semibold hover:bg-ink-soft transition"
                >
                  <Mail className="h-4 w-4" /> {EMAIL}
                </a>
              </div>
              <p className="mt-5 text-xs text-muted-foreground">
                Confidential · NDA on request · Mon–Fri 7a–7p CT
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-hairline py-10">
        <div className="container-tight flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <img src={emblem} alt="" width={24} height={24} className="h-6 w-6" />
            <span>© {new Date().getFullYear()} Savage Growth Partners. All rights reserved.</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 justify-center">
            <a href={PHONE_HREF} className="hover:text-foreground transition inline-flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5 text-amber-brand" /> {PHONE_DISPLAY}
            </a>
            <a href={`mailto:${EMAIL}`} className="hover:text-foreground transition">{EMAIL}</a>
            <span>savagesupplies.us</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
