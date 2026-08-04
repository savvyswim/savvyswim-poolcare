import { useState } from "react";
import { Link } from "react-router-dom";
import {
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
} from "lucide-react";
import Seo from "@/components/Seo";
import { BookingDialog } from "@/components/BookingDialog";

const PHONE_DISPLAY = "(469) 213-8087";
const PHONE_HREF = "tel:+14692138087";

const SERVICES = [
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
  },
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
        <div className="container-tight flex h-[72px] items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="relative h-10 w-10 border border-primary/25 grid place-items-center">
              <Waves className="h-4 w-4 text-accent" />
            </div>
            <span className="tracking-tight text-base leading-tight flex flex-col">
              <span className="font-display text-[19px] tracking-[0.02em]">SAVVY SWIM</span>
              <span className="font-tech text-[8.5px] text-primary/45">A Santana &amp; Rivera Company</span>
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-7 font-tech text-primary/70">
            <Link to="/" className="hover:text-accent transition">Home</Link>
            <Link to="/services" className="text-accent">Services</Link>
            <Link to="/#membership" className="hover:text-accent transition">Swim Club</Link>
            <Link to="/#contact" className="hover:text-accent transition">Contact</Link>
          </nav>
          <a
            href={PHONE_HREF}
            className="inline-flex items-center gap-2 text-sm font-semibold hover:text-primary transition"
          >
            <Phone className="h-4 w-4 text-amber-brand" /> {PHONE_DISPLAY}
          </a>
        </div>
      </header>

      <main>
        <section className="py-20 sm:py-28">
          <div className="container-tight">
            <div className="max-w-2xl mb-14 border-t-2 border-accent pt-6">
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground mb-3">
                What we do
              </div>
              <h1 className="font-display text-[2.4rem] sm:text-[3.4rem] leading-[1.02] tracking-tight uppercase">
                Cleaning, service &amp; repair.
              </h1>
              <p className="mt-4 text-muted-foreground text-base leading-relaxed">
                Weekly maintenance, equipment repair, and everything in between —
                one team, one phone call, no contracts.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {SERVICES.map((s) => (
                <button
                  key={s.title}
                  type="button"
                  onClick={() => openBooking(s.title)}
                  aria-label={`Book a free quote for ${s.title}`}
                  className="text-left card-3d rounded-sm p-6 sm:p-7 group flex flex-col cursor-pointer"
                >
                  <div className="flex items-center gap-3 mb-5">
                    <s.icon className="h-[18px] w-[18px] text-amber-brand" strokeWidth={1.75} />
                    <span className="h-px flex-1 bg-hairline" />
                  </div>
                  <h2 className="text-[1.15rem] font-semibold mb-2 leading-snug">{s.title}</h2>
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

                  <span className="mt-auto inline-flex items-center justify-between gap-2 border-t border-hairline pt-4 text-[13px] font-semibold uppercase tracking-[0.1em] text-foreground group-hover:text-primary transition">
                    <span>Book Free Quote</span>
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </button>
              ))}
            </div>

            <div className="mt-16 border-t border-hairline pt-10 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
              <p className="text-muted-foreground max-w-md">
                Not sure what you need? Tell us what the pool is doing and we'll
                point you to the right service.
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => openBooking()}
                  className="btn-quote inline-flex items-center gap-2 rounded-md px-5 py-3 text-[13px] font-bold uppercase tracking-wide transition"
                >
                  Request Quote
                </button>
                <a
                  href={PHONE_HREF}
                  className="inline-flex items-center gap-2 rounded-md border border-hairline px-5 py-3 text-[13px] font-bold uppercase tracking-wide hover:text-primary transition"
                >
                  <Phone className="h-4 w-4" /> Call
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <BookingDialog
        open={bookingOpen}
        onOpenChange={setBookingOpen}
        defaultService={bookingService}
      />
    </div>
  );
};

export default Services;
