import { useState } from "react";
import { Link } from "@/lib/router-compat";
import {
  Instagram,
  Waves,
  Phone,
  Droplets,
  Wrench,
  Sparkles,
  Cpu,
  Sun,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  MessageSquare,
} from "lucide-react";
import Seo from "@/components/Seo";
import { buildSmsHref, trackContactClick } from "@/lib/contactTracking";
import { BookingDialog } from "@/components/BookingDialog";

import { IMG_5512_PNG as photoLifeguardChair } from "@/assets/photos";
import { IMG_5507_2_JPG as photoNavyCabana } from "@/assets/photos";
import { IMG_5508_2_JPG as photoRivieraLoungers } from "@/assets/photos";
import { IMG_5518_PNG as photoSavvyRings } from "@/assets/photos";
import photoRescueTube from "@/assets/IMG_5503.jpg.asset.json";
import { IMG_5502_PNG as photoSavvyLetters } from "@/assets/photos";
import { IMG_5494_JPG as photoOliveRings } from "@/assets/photos";
import { IMG_5497_2_jpg as photoRedUmbrellas } from "@/assets/photos";

const PHONE_DISPLAY = "(469) 744-0379";
const PHONE_HREF = "tel:+14697440379";
const EMAIL = "hello@savvyswim.com";
const SMS_PHONE = "+14697440379";


const SERVICES = [
  {
    no: "01",
    icon: Droplets,
    title: "Weekly Pool Cleaning",
    photo: photoNavyCabana.url,
    alt: "Navy and white striped cabana umbrella beside a clear pool",
    desc: "Crystal-clear water, year-round. Certified techs handle chemistry, cleaning, and equipment checks.",
    includes: [
      "Weekly chemistry balance",
      "Skim, brush, vacuum & filter",
      "Equipment inspection",
      "Photo report after every visit",
    ],
  },
  {
    no: "02",
    icon: Wrench,
    title: "Equipment Repair",
    photo: photoRescueTube.url,
    alt: "Savvy Swim rescue tube floating in a pool",
    desc: "Pumps, filters, heaters, and automation diagnosed and repaired — most parts stocked on the truck.",
    includes: [
      "Pump & motor repair",
      "Filter cleans & cartridge swaps",
      "Heater diagnostics & repair",
      "Valve & plumbing leaks",
    ],
  },
  {
    no: "03",
    icon: Sparkles,
    title: "Green Pool Recovery",
    photo: photoSavvyLetters.url,
    alt: "White inflatable SAVVY letters floating in clear blue water",
    desc: "Algae, storm debris, or a pool left too long — we get it swim-ready fast with a full chemical reset.",
    includes: [
      "Shock & algaecide treatment",
      "Deep vacuum & brush-out",
      "Filter deep clean",
      "Follow-up balance visits",
    ],
  },
  {
    no: "04",
    icon: Cpu,
    title: "Salt & Automation Service",
    photo: photoSavvyRings.url,
    alt: "Red and white striped Savvy inflatable rings",
    desc: "Salt cell cleaning, chlorinator replacement, and smart controls tuned so your system runs hands-free.",
    includes: [
      "Salt cell clean & replace",
      "Pentair / Jandy / Hayward systems",
      "Variable-speed pump programming",
      "App control setup",
    ],
  },
  {
    no: "05",
    icon: Sun,
    title: "Seasonal Openings & Closings",
    photo: photoRivieraLoungers.url,
    alt: "Red and white striped loungers and fringed umbrellas by a pool",
    desc: "Get the pool ready for summer or buttoned up for winter — covers, freeze protection, and a full check.",
    includes: [
      "Open & balance for the season",
      "Winterize & freeze protection",
      "Cover install & removal",
      "Full equipment inspection",
    ],
  },
  {
    no: "06",
    icon: ShieldCheck,
    title: "Tile, Deck & Surface Care",
    photo: photoOliveRings.url,
    alt: "Olive and white striped inflatable rings on clear water",
    desc: "Waterline tile scale removal, deck wash-downs, and surface spot care to keep everything looking new.",
    includes: [
      "Waterline tile cleaning",
      "Calcium & scale removal",
      "Deck & coping wash",
      "Stain treatment",
    ],
  },
];

const PROCESS = [
  { no: "I", title: "Walkthrough", desc: "We inspect the pool, equipment pad, and water chemistry — then quote flat." },
  { no: "II", title: "Same tech, same day", desc: "One assigned technician on a fixed weekly cadence. No rotating crews." },
  { no: "III", title: "Photo report", desc: "Readouts and photos land in your inbox after every single visit." },
];

const Services = () => {
  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookingService, setBookingService] = useState<string | undefined>();

  const openBooking = (service?: string) => {
    setBookingService(service);
    setBookingOpen(true);
  };

  return (
    <div className="min-h-screen overflow-x-hidden">
      <Seo
        title="Pool Services — Cleaning, Service & Repair | Savvy Swim"
        description="Weekly pool cleaning, equipment repair, green pool recovery, salt and automation service across DFW. One team, one phone call, no contracts."
        path="/services"
      />

      {/* NAV */}
      <header className="border-b border-hairline bg-background">
        <div className="container-tight flex h-[64px] items-center justify-between gap-3 sm:h-[76px] sm:gap-4">
          <Link to="/" aria-label="Savvy Swim — home" className="flex min-w-0 shrink items-center gap-3">
            <span className="whitespace-nowrap font-display text-[1.15rem] uppercase leading-none tracking-tight text-accent xs:text-[1.3rem] sm:text-[1.6rem] lg:text-[1.9rem]">
              Savvy Swim
            </span>
            <span aria-hidden="true" className="hidden whitespace-nowrap font-tech text-[9px] leading-tight text-primary/60 lg:block xl:hidden">
              On duty, so you don&rsquo;t have to be.
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-7 font-tech text-primary/70">
            <Link to="/" className="hover:text-accent transition">Home</Link>
            <Link to="/services" className="text-accent">Services</Link>
            <Link to="/#membership" className="hover:text-accent transition">Swim Club</Link>
            <Link to="/#contact" className="hover:text-accent transition">Contact</Link>
          </nav>
          <a
            href={PHONE_HREF} onClick={() => trackContactClick("call_click", "header")}
            className="inline-flex items-center gap-2 text-sm font-semibold hover:text-primary transition"
          >
            <Phone className="h-4 w-4 text-amber-brand" /> {PHONE_DISPLAY}
          </a>
        </div>
      </header>

      <main>
        {/* HERO */}
        <section className="border-b border-hairline">
          <div className="container-tight py-16 sm:py-20">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-end">
              <div className="lg:col-span-7">
                <div className="border-t-2 border-accent pt-6">
                  <div className="font-tech text-[11px] uppercase tracking-[0.24em] text-muted-foreground mb-4">
                    What we do
                  </div>
                  <h1 className="font-display text-[2.6rem] sm:text-[4.2rem] leading-[0.94] tracking-tight uppercase">
                    Cleaning, service<br />
                    &amp; <span className="text-accent">repair.</span>
                  </h1>
                  <p className="mt-6 max-w-xl text-muted-foreground text-base leading-relaxed">
                    Weekly maintenance, equipment repair, and everything in between —
                    one team, one phone call, no contracts.
                  </p>
                  <p className="mt-4 font-serif italic text-xl text-foreground/80">
                    On duty, so you don't have to be.
                  </p>
                  <div className="mt-8 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => openBooking()}
                      className="btn-quote inline-flex items-center gap-2 rounded-md px-6 py-3.5 text-[13px] font-bold uppercase tracking-wide transition"
                    >
                      Start Service <ArrowRight className="h-4 w-4" />
                    </button>
                    <a
                      href={PHONE_HREF} onClick={() => trackContactClick("call_click", "service_row")}
                      className="inline-flex items-center gap-2 rounded-md border border-hairline px-6 py-3.5 text-[13px] font-bold uppercase tracking-wide hover:text-primary transition"
                    >
                      <Phone className="h-4 w-4" /> {PHONE_DISPLAY}
                    </a>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-5">
                <figure className="relative">
                  <img
                    src={photoLifeguardChair.url}
                    alt="Savvy Swim lifeguard chair with a red striped umbrella beside a pool"
                    className="w-full aspect-[4/5] object-cover rounded-sm"
                    loading="eager"
                    decoding="async"
                    fetchPriority="high"
                  />
                  <figcaption className="mt-3 flex items-center justify-between font-tech text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                    <span>Plate I — On duty</span>
                    <span>DFW / TX</span>
                  </figcaption>
                </figure>
              </div>
            </div>
          </div>
        </section>

        {/* SPEC STRIP */}
        <section className="border-b border-hairline bg-primary/[0.03]">
          <div className="container-tight grid grid-cols-2 md:grid-cols-4 divide-x divide-hairline">
            {[
              ["Visits / year", "52"],
              ["Clarity target", "99.8%"],
              ["Commitment", "Month to month"],
              ["Response", "24 hrs"],
            ].map(([label, value]) => (
              <div key={label} className="px-4 py-6 first:pl-0">
                <div className="font-display text-xl sm:text-2xl md:text-3xl tracking-tight leading-tight text-balance">{value}</div>
                <div className="font-tech text-[10px] uppercase tracking-[0.2em] text-muted-foreground mt-1">
                  {label}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* SERVICES */}
        <section className="perf-section py-16 sm:py-24">
          <div className="container-tight">
            <div className="flex items-end justify-between gap-6 mb-10 border-b border-hairline pb-5">
              <h2 className="font-display text-[1.7rem] sm:text-[2.2rem] uppercase tracking-tight leading-none">
                The service list
              </h2>
              <span className="font-tech text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                Six / Six
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {SERVICES.map((s) => (
                <button
                  key={s.title}
                  type="button"
                  onClick={() => openBooking(s.title)}
                  aria-label={`Book a free quote for ${s.title}`}
                  className="text-left card-3d rounded-sm overflow-hidden group flex flex-col cursor-pointer"
                >
                  <div className="relative overflow-hidden">
                    <img
                      src={s.photo}
                      alt={s.alt}
                      loading="lazy"
                  decoding="async"
                      className="w-full aspect-[4/3] object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                    />
                    <span className="absolute top-3 left-3 font-tech text-[10px] tracking-[0.2em] bg-background/85 px-2 py-1 rounded-sm">
                      {s.no}
                    </span>
                  </div>

                  <div className="p-6 sm:p-7 flex flex-col flex-1">
                    <div className="flex items-center gap-3 mb-4">
                      <s.icon className="h-[18px] w-[18px] text-amber-brand" strokeWidth={1.75} />
                      <span className="h-px flex-1 bg-hairline" />
                    </div>
                    <h3 className="text-[1.15rem] font-semibold mb-2 leading-snug">{s.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>

                    <div className="my-5 h-px bg-hairline" />

                    <div className="font-tech text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3">
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

                    <span className="mt-auto inline-flex items-center justify-between gap-2 border-t border-hairline pt-4 text-[13px] font-semibold uppercase tracking-[0.1em] text-foreground group-hover:text-primary transition">
                      <span>Book Free Quote</span>
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* PROCESS */}
        <section className="perf-section border-y border-hairline bg-primary/[0.03] py-16 sm:py-20">
          <div className="container-tight grid grid-cols-1 lg:grid-cols-12 gap-10">
            <div className="lg:col-span-5">
              <img
                src={photoRedUmbrellas.url}
                alt="Red and white striped fringed umbrellas against a blue sky"
                loading="lazy"
                  decoding="async"
                className="w-full aspect-[5/4] object-cover rounded-sm"
              />
            </div>
            <div className="lg:col-span-7">
              <div className="font-tech text-[11px] uppercase tracking-[0.24em] text-muted-foreground mb-4">
                How it runs
              </div>
              <h2 className="font-display text-[1.9rem] sm:text-[2.6rem] uppercase tracking-tight leading-[1] mb-8">
                Three steps. Then you stop thinking about it.
              </h2>
              <div className="divide-y divide-hairline border-t border-hairline">
                {PROCESS.map((p) => (
                  <div key={p.title} className="py-5 flex gap-6">
                    <span className="font-tech text-[11px] text-accent w-8 pt-1">{p.no}</span>
                    <div>
                      <h3 className="font-semibold mb-1">{p.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed max-w-lg">{p.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="perf-section py-16 sm:py-24">
          <div className="container-tight">
            <div className="border border-hairline bg-primary/[0.03] grid grid-cols-1 lg:grid-cols-12">
              <div className="lg:col-span-5 p-8 sm:p-12 lg:border-r border-hairline">
                <span className="font-tech text-[10px] uppercase tracking-[0.22em] text-accent">
                  Free quote · no pressure
                </span>
                <h2 className="mt-4 font-display text-[2rem] sm:text-[2.8rem] uppercase tracking-tight leading-[0.95] text-primary">
                  Not sure what<br />you need?
                </h2>
                <p className="mt-4 text-muted-foreground leading-relaxed max-w-sm">
                  Tell us what the pool is doing and we'll point you to the right
                  service. Most quotes come back the same day.
                </p>
                <button
                  type="button"
                  onClick={() => openBooking()}
                  className="btn-quote mt-7 inline-flex w-full sm:w-auto items-center justify-center gap-2 px-8 py-4 text-[13px] font-bold uppercase tracking-wide transition"
                >
                  Request a quote
                </button>
              </div>

              <div className="lg:col-span-7 divide-y divide-hairline border-t lg:border-t-0 border-hairline">
                {[
                  {
                    href: PHONE_HREF,
                    icon: Phone,
                    label: "Call us",
                    hint: PHONE_DISPLAY,
                    track: () => trackContactClick("call_click", "final_cta"),
                  },
                  {
                    href: buildSmsHref(SMS_PHONE),
                    icon: MessageSquare,
                    label: "Text for a free pool quote",
                    hint: "Send a photo of the water",
                    track: () => trackContactClick("text_click", "services_final_cta_text"),
                  },
                ].map((c) => (
                  <a
                    key={c.label}
                    href={c.href}
                    onClick={c.track}
                    className="group flex items-center gap-5 px-8 sm:px-10 py-7 transition hover:bg-primary/[0.05]"
                  >
                    <c.icon className="h-5 w-5 text-accent flex-shrink-0" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] font-bold uppercase tracking-wide">{c.label}</span>
                      <span className="block text-sm text-muted-foreground truncate">{c.hint}</span>
                    </span>
                    <ArrowRight className="h-4 w-4 flex-shrink-0 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-primary" />
                  </a>
                ))}
                <Link
                  to="/request-inspection"
                  className="group flex items-center gap-5 px-8 sm:px-10 py-7 transition hover:bg-primary/[0.05]"
                >
                  <Waves className="h-5 w-5 text-accent flex-shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-bold uppercase tracking-wide">Request a free pool visit</span>
                    <span className="block text-sm text-muted-foreground truncate">We inspect on site, then quote</span>
                  </span>
                  <ArrowRight className="h-4 w-4 flex-shrink-0 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-primary" />
                </Link>
              </div>
            </div>
          </div>
        </section>

      </main>

      <footer className="border-t border-hairline py-10">
        <div className="container-tight flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Waves className="h-4 w-4 text-amber-brand" />
            <span>© {new Date().getFullYear()} Savvy Swim · A Santana &amp; Rivera Company. All rights reserved.</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            <a href={`mailto:${EMAIL}`} className="hover:text-foreground transition">{EMAIL}</a>
            <a href={PHONE_HREF} onClick={() => trackContactClick("call_click", "footer")} className="hover:text-foreground transition">{PHONE_DISPLAY}</a>
            <a href="https://www.instagram.com/hi.savvyswim?igsh=a2g5eWpndHA0Zm5j&amp;utm_source=qr" target="_blank" rel="noopener noreferrer" aria-label="Savvy Swim on Instagram" className="inline-flex items-center gap-1.5 hover:text-foreground transition"><Instagram className="h-4 w-4" />Instagram</a>
            <Link to="/pool-cleaning-frisco-tx" className="hover:text-foreground transition">Pool Cleaning Frisco TX</Link>
            <Link to="/privacy-policy" className="hover:text-foreground transition">Privacy Policy</Link>
            <Link to="/terms-and-conditions" className="hover:text-foreground transition">Terms &amp; Conditions</Link>
          </div>
        </div>
      </footer>

      <BookingDialog
        open={bookingOpen}
        onOpenChange={setBookingOpen}
        {...(bookingService !== undefined ? { defaultService: bookingService } : {})}
      />
    </div>
  );
};

export default Services;
