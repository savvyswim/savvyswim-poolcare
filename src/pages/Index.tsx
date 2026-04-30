import heroImage from "@/assets/hero-hail-repair.jpg";
import {
  Phone,
  MessageSquare,
  ShieldCheck,
  MapPin,
  FileCheck2,
  Clock,
  Sparkles,
  Wrench,
  ClipboardCheck,
  HandshakeIcon,
  Car,
  CloudLightning,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";

const PHONE_DISPLAY = "(945) 291-9994";
const PHONE_TEL = "+19452919994";
const PHONE_SMS = "19452919994";

const trustItems = [
  { icon: ShieldCheck, label: "Insurance-approved repair process" },
  { icon: MapPin, label: "Mobile inspection at your location" },
  { icon: FileCheck2, label: "We assist with insurance documentation" },
  { icon: Clock, label: "Fast turnaround times" },
  { icon: Sparkles, label: "No repaint — preserves factory finish" },
];

const services = [
  { icon: Wrench, title: "Paintless Dent Repair (PDR)", desc: "Precision restoration that preserves your vehicle's original factory paint." },
  { icon: ClipboardCheck, title: "Storm Damage Inspection", desc: "Detailed documentation of every dent, panel, and impact point." },
  { icon: HandshakeIcon, title: "Insurance Claim Support", desc: "Coordination with your provider from first notice to final repair." },
  { icon: ShieldCheck, title: "OEM-Quality Standards", desc: "Repairs completed to the standard your manufacturer expects." },
  { icon: Car, title: "Mobile Service", desc: "We come to your home or workplace for inspection and pickup." },
];

const Section = ({ children, className = "", id }: { children: React.ReactNode; className?: string; id?: string }) => (
  <section id={id} className={`py-16 sm:py-24 ${className}`}>
    <div className="container-tight">{children}</div>
  </section>
);

const Eyebrow = ({ children }: { children: React.ReactNode }) => (
  <div className="inline-flex items-center gap-2 rounded-full border border-hairline bg-secondary px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
    <span className="h-1.5 w-1.5 rounded-full bg-yellow-brand" />
    {children}
  </div>
);

const Index = () => {
  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* NAV */}
      <header className="sticky top-0 z-50 border-b border-hairline bg-background/85 backdrop-blur">
        <div className="container-tight flex h-16 items-center justify-between">
          <a href="#" className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-md bg-ink">
              <Wrench className="h-4 w-4 text-yellow-brand" />
            </span>
            <span className="text-sm font-bold tracking-tight">
              Perfect Hammer<span className="text-muted-foreground font-medium"> · Hail Team</span>
            </span>
          </a>
          <a
            href={`tel:${PHONE_TEL}`}
            className="hidden sm:inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 transition"
          >
            <Phone className="h-3.5 w-3.5" />
            {PHONE_DISPLAY}
          </a>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden border-b border-hairline">
        <div className="container-tight grid gap-12 py-12 sm:py-20 lg:grid-cols-2 lg:items-center lg:gap-16">
          <div className="order-2 lg:order-1">
            <Eyebrow>Storm Response Active</Eyebrow>
            <h1 className="mt-5 text-4xl font-bold leading-[1.05] sm:text-5xl lg:text-6xl">
              Hail Damage in Your Area?
              <span className="mt-2 block">
                <span className="bg-yellow-brand px-2 py-0.5 text-ink">Free Vehicle Inspection</span> Available.
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              Professional Paintless Dent Repair (PDR) with insurance claim support from start to finish. No repaint. No pressure. Just precision.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href={`tel:${PHONE_TEL}`}
                className="group inline-flex items-center justify-center gap-3 rounded-xl bg-yellow-brand px-6 py-4 text-base font-bold text-ink shadow-cta transition hover:translate-y-[-1px]"
              >
                <Phone className="h-5 w-5" />
                <span className="flex flex-col items-start leading-tight">
                  <span className="text-[11px] font-semibold uppercase tracking-wider opacity-70">Call or Text Now</span>
                  <span>{PHONE_DISPLAY}</span>
                </span>
              </a>
              <a
                href="#inspection"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-ink/15 bg-background px-6 py-4 text-base font-semibold text-ink hover:bg-secondary transition"
              >
                Request Free Inspection
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>

            <div className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-ink" />
              Insurance-approved process · 20+ years experience · Mobile service
            </div>
          </div>

          <div className="order-1 lg:order-2">
            <div className="relative">
              <div className="absolute -inset-4 -z-10 rounded-[2rem] bg-yellow-brand/30 blur-2xl" />
              <div className="overflow-hidden rounded-2xl border border-hairline shadow-card">
                <img
                  src={heroImage}
                  alt="Before and after of a vehicle with hail damage repaired by Paintless Dent Repair"
                  width={1536}
                  height={1024}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="absolute -bottom-4 left-4 right-4 flex items-center justify-between rounded-xl bg-ink px-4 py-3 text-primary-foreground shadow-card sm:left-6 sm:right-auto sm:gap-6">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-yellow-brand">Before</div>
                  <div className="text-sm font-semibold">Hail-impacted</div>
                </div>
                <div className="h-8 w-px bg-white/15" />
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-yellow-brand">After</div>
                  <div className="text-sm font-semibold">Factory finish</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TRUST STRIP */}
      <section className="border-b border-hairline bg-secondary/60">
        <div className="container-tight py-8">
          <ul className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-5">
            {trustItems.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-start gap-3 text-sm font-medium text-ink">
                <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-ink">
                  <Icon className="h-3.5 w-3.5 text-yellow-brand" />
                </span>
                {label}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* SERVICES */}
      <Section id="services">
        <div className="max-w-2xl">
          <Eyebrow>Services</Eyebrow>
          <h2 className="mt-4 text-3xl font-bold sm:text-4xl">Professional Hail Damage Restoration</h2>
          <p className="mt-3 text-muted-foreground">
            A complete process built around your vehicle's value and your insurance policy — handled by certified PDR technicians.
          </p>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {services.map(({ icon: Icon, title, desc }) => (
            <article
              key={title}
              className="group relative overflow-hidden rounded-2xl border border-hairline bg-card p-6 transition hover:border-ink/20 hover:shadow-card"
            >
              <div className="mb-5 grid h-11 w-11 place-items-center rounded-xl bg-ink">
                <Icon className="h-5 w-5 text-yellow-brand" />
              </div>
              <h3 className="text-lg font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{desc}</p>
              <div className="absolute bottom-0 left-0 h-0.5 w-0 bg-yellow-brand transition-all duration-500 group-hover:w-full" />
            </article>
          ))}
        </div>
      </Section>

      {/* INSURANCE SUPPORT */}
      <section className="border-y border-hairline bg-ink text-primary-foreground">
        <div className="container-tight grid gap-12 py-20 lg:grid-cols-2 lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-yellow-brand">
              <ShieldCheck className="h-3.5 w-3.5" />
              Insurance Process Support
            </div>
            <h2 className="mt-5 text-3xl font-bold sm:text-4xl">
              We work alongside policyholders and insurance providers for a smooth repair process.
            </h2>
            <p className="mt-4 max-w-lg text-white/70">
              Our role is to make the claim simple, accurate, and fully documented — so the focus stays on getting your vehicle back to original condition.
            </p>
          </div>

          <ul className="space-y-4">
            {[
              { t: "Claim Documentation Assistance", d: "Detailed inspection reports, photo evidence, and repair scope." },
              { t: "Adjuster Coordination", d: "We communicate directly with your adjuster when applicable." },
              { t: "Approved Scope of Work", d: "Repairs completed precisely to the approved estimate." },
            ].map(({ t, d }) => (
              <li key={t} className="flex gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-5">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-yellow-brand" />
                <div>
                  <div className="font-semibold">{t}</div>
                  <div className="mt-1 text-sm text-white/65">{d}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* CONVENIENCE */}
      <Section>
        <div className="grid gap-10 lg:grid-cols-3">
          {[
            { icon: MapPin, title: "Mobile Inspections", desc: "We come to your home or workplace at a time that works for you." },
            { icon: Car, title: "Courtesy Transportation", desc: "Transportation options may be available based on eligibility." },
            { icon: ClipboardCheck, title: "Handled End-to-End", desc: "From inspection to final detail, we manage every step." },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-2xl border border-hairline p-7">
              <Icon className="h-6 w-6 text-ink" />
              <h3 className="mt-5 text-lg font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* ABOUT */}
      <section className="border-y border-hairline bg-secondary/50">
        <div className="container-tight grid gap-12 py-20 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-5">
            <Eyebrow>About</Eyebrow>
            <h2 className="mt-4 text-3xl font-bold sm:text-4xl">Trusted Hail Damage Specialists.</h2>
            <p className="mt-4 text-muted-foreground">
              Perfect Hammer Hail Team has spent two decades restoring vehicles to factory condition with the precision of Paintless Dent Repair.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:col-span-7">
            {[
              { k: "20+", v: "Years of PDR experience" },
              { k: "US + EU", v: "Clients served across two continents" },
              { k: "OEM", v: "Quality and precision standards" },
              { k: "Certified", v: "Trained, professional technicians" },
            ].map(({ k, v }) => (
              <div key={k} className="rounded-2xl border border-hairline bg-background p-6">
                <div className="text-3xl font-bold tracking-tight">{k}</div>
                <div className="mt-1 text-sm text-muted-foreground">{v}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* URGENCY */}
      <Section>
        <div className="overflow-hidden rounded-3xl border border-hairline bg-card p-8 sm:p-12">
          <div className="flex flex-col items-start gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-yellow-brand/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-ink">
                <CloudLightning className="h-3.5 w-3.5" />
                Time-Sensitive
              </div>
              <h2 className="mt-4 text-3xl font-bold sm:text-4xl">Storm damage is time-sensitive.</h2>
              <p className="mt-3 text-muted-foreground">
                Early inspection helps ensure accurate documentation and a smoother insurance process. There is no cost to know where you stand.
              </p>
            </div>
            <a
              href={`tel:${PHONE_TEL}`}
              className="inline-flex items-center gap-3 rounded-xl bg-ink px-6 py-4 font-semibold text-primary-foreground shadow-cta hover:opacity-95 transition"
            >
              <Phone className="h-5 w-5 text-yellow-brand" />
              Schedule Free Inspection
            </a>
          </div>
        </div>
      </Section>

      {/* FINAL CTA */}
      <section id="inspection" className="relative overflow-hidden bg-ink text-primary-foreground">
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, hsl(var(--yellow)) 0, transparent 40%), radial-gradient(circle at 80% 60%, hsl(var(--yellow)) 0, transparent 35%)",
          }}
        />
        <div className="container-tight relative py-20 text-center sm:py-28">
          <Eyebrow>Get Started</Eyebrow>
          <h2 className="mx-auto mt-5 max-w-3xl text-4xl font-bold leading-tight sm:text-5xl">
            Get your <span className="text-yellow-brand">free inspection</span> today.
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-white/70">
            One call starts the entire process — inspection, documentation, and repair. We'll handle the rest.
          </p>

          <div className="mx-auto mt-10 flex max-w-xl flex-col gap-3 sm:flex-row sm:justify-center">
            <a
              href={`tel:${PHONE_TEL}`}
              className="inline-flex flex-1 items-center justify-center gap-3 rounded-xl bg-yellow-brand px-6 py-4 text-base font-bold text-ink shadow-cta transition hover:translate-y-[-1px]"
            >
              <Phone className="h-5 w-5" />
              Call Now · {PHONE_DISPLAY}
            </a>
            <a
              href={`sms:${PHONE_SMS}`}
              className="inline-flex flex-1 items-center justify-center gap-3 rounded-xl border border-white/20 bg-white/5 px-6 py-4 text-base font-semibold text-primary-foreground hover:bg-white/10 transition"
            >
              <MessageSquare className="h-5 w-5" />
              Book Inspection Online
            </a>
          </div>

          <div className="mt-10 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs text-white/75">
            <MapPin className="h-3.5 w-3.5 text-yellow-brand" />
            Currently assisting vehicle owners in storm-affected neighborhoods in your area.
          </div>

          <div className="mt-6 text-sm text-white/55">
            theperfecthammer.com · {PHONE_DISPLAY}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-hairline bg-background">
        <div className="container-tight flex flex-col items-start justify-between gap-4 py-8 text-xs text-muted-foreground sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <span className="grid h-6 w-6 place-items-center rounded bg-ink">
              <Wrench className="h-3 w-3 text-yellow-brand" />
            </span>
            <span className="font-semibold text-ink">Perfect Hammer Hail Team</span>
            <span>· © {new Date().getFullYear()}</span>
          </div>
          <div>Insurance-approved Paintless Dent Repair · {PHONE_DISPLAY}</div>
        </div>
      </footer>

      {/* MOBILE STICKY CALL BAR */}
      <div className="fixed bottom-4 left-4 right-4 z-50 sm:hidden">
        <a
          href={`tel:${PHONE_TEL}`}
          className="flex items-center justify-center gap-3 rounded-2xl bg-yellow-brand px-5 py-4 text-base font-bold text-ink shadow-cta"
        >
          <Phone className="h-5 w-5" />
          Call Now · {PHONE_DISPLAY}
        </a>
      </div>
    </main>
  );
};

export default Index;
