import { useState } from "react";
import { Link } from "react-router-dom";
import { Instagram, Waves, Phone, Droplets, Wrench, Sparkles, ShieldCheck, CheckCircle2, MapPin, MessageSquare } from "lucide-react";
import Seo from "@/components/Seo";
import { trackContactClick } from "@/lib/contactTracking";
import { BookingDialog } from "@/components/BookingDialog";

import photoNavyCabana from "@/assets/IMG_5507-2.JPG.asset.json";
import photoRivieraLoungers from "@/assets/IMG_5508-2.JPG.asset.json";
import photoSavvyLetters from "@/assets/IMG_5502.PNG.asset.json";
import photoRedUmbrellas from "@/assets/IMG_5497-2.jpg.asset.json";

const PHONE_DISPLAY = "(469) 744-0379";
const PHONE_HREF = "tel:+14697440379";
const EMAIL = "hello@savvyswim.com";
const HAIL_SMS_BODY =
  "Hi Savvy Swim — I'd like to schedule a hail damage inspection for my pool and equipment. My address is:";
const SMS_HREF = `sms:+14697440379?&body=${encodeURIComponent(HAIL_SMS_BODY)}`;

const NEIGHBORHOODS = [
  "Starwood", "Newman Village", "Phillips Creek Ranch", "Panther Creek",
  "Frisco Lakes", "Stonebriar", "The Trails", "Richwoods", "Preston Vineyards",
];

const SERVICES = [
  {
    no: "01",
    icon: Droplets,
    title: "Weekly pool cleaning in Frisco",
    desc: "Skim, brush, vacuum, empty baskets, and balance chemistry every week — with a photo report before we leave the driveway.",
  },
  {
    no: "02",
    icon: Sparkles,
    title: "Green pool recovery",
    desc: "North Texas storms and a week of 100° heat turn pools green fast. Full chemical reset, deep vacuum, and filter clean to get it swim-ready.",
  },
  {
    no: "03",
    icon: Wrench,
    title: "Equipment repair",
    desc: "Pumps, filters, heaters, salt cells, and automation — most parts stocked on the truck, so Frisco repairs usually finish in one trip.",
  },
  {
    no: "04",
    icon: ShieldCheck,
    title: "Hard-water & scale care",
    desc: "Frisco's hard water leaves calcium at the waterline. We treat scale, keep tile clean, and manage calcium hardness all year.",
  },
];

const FAQ = [
  {
    q: "How much does pool cleaning in Frisco, TX cost?",
    a: "Frisco weekly service starts at $129.99 a month, including chemicals. Size, spa, and pool condition set the final number — we quote flat after a walkthrough, and the price does not change week to week.",
  },
  {
    q: "What day do you service Frisco pools?",
    a: "Frisco runs on a fixed weekly route day with the same assigned technician. You get an on-my-way text before arrival and a photo report with chemistry readings after every visit.",
  },
  {
    q: "Do I have to be home?",
    a: "No. We work around gate codes, dogs, and locked side yards — that's the whole point of on duty, so you don't have to be. Everything you need to see shows up in the visit report.",
  },
  {
    q: "What if the water isn't clear after a visit?",
    a: "We come back free, same day, if it's our fault. If landscaping, a storm, or a third party caused it, you still get one complimentary return visit.",
  },
];

const FriscoPoolCleaning = () => {
  const [bookingOpen, setBookingOpen] = useState(false);

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Service",
      name: "Pool Cleaning Frisco TX",
      serviceType: "Pool cleaning and maintenance",
      provider: {
        "@type": "LocalBusiness",
        name: "Savvy Swim",
        telephone: "+1-469-744-0379",
        email: EMAIL,
        url: "https://savvyswim.com",
        areaServed: { "@type": "City", name: "Frisco", addressRegion: "TX" },
      },
      areaServed: { "@type": "City", name: "Frisco", addressRegion: "TX" },
      offers: {
        "@type": "Offer",
        priceCurrency: "USD",
        priceSpecification: {
          "@type": "PriceSpecification",
          minPrice: 129.99,
          maxPrice: 280,
          priceCurrency: "USD",
        },
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: FAQ.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  ];

  return (
    <div className="min-h-screen overflow-x-hidden">
      <Seo
        title="Pool Cleaning Frisco TX — Weekly Service & Repair | Savvy Swim"
        description="Pool cleaning in Frisco, TX from $129.99/mo. Weekly chemistry, cleaning, and equipment checks with a photo report every visit. Same tech, same day, no contracts."
        path="/pool-cleaning-frisco-tx"
        jsonLd={jsonLd}
      />

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
            <Link to="/services" className="hover:text-accent transition">Services</Link>
            <Link to="/#membership" className="hover:text-accent transition">Swim Club</Link>
            <Link to="/#contact" className="hover:text-accent transition">Contact</Link>
          </nav>
          <a
            href={PHONE_HREF}
            onClick={() => trackContactClick("call_click", "frisco_header")}
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
                  <div className="font-tech text-[11px] uppercase tracking-[0.24em] text-muted-foreground mb-4 inline-flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5" /> Frisco, Texas · 75033 / 75034 / 75035 / 75036
                  </div>
                  <h1 className="font-display uppercase leading-[0.94] tracking-tight" style={{ fontSize: "clamp(2.2rem, 5.4vw, 4.2rem)" }}>
                    Pool cleaning<br />
                    <span className="text-accent">Frisco, TX.</span>
                  </h1>
                  <p className="mt-6 max-w-xl text-muted-foreground text-base leading-relaxed">
                    Weekly pool cleaning for Frisco homeowners — chemistry balanced, baskets emptied,
                    equipment checked, and a photo report in your inbox before we pull out of the driveway.
                  </p>
                  <p className="mt-4 font-serif italic text-xl text-foreground/80">
                    On duty, so you don't have to be.
                  </p>
                  <div className="mt-8 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => setBookingOpen(true)}
                      className="btn-quote inline-flex items-center gap-2 rounded-md px-6 py-3.5 text-[13px] font-bold uppercase tracking-wide transition"
                    >
                      Get a Frisco quote
                    </button>
                    <a
                      href={PHONE_HREF}
                      onClick={() => trackContactClick("call_click", "frisco_hero")}
                      className="inline-flex items-center gap-2 rounded-md border border-hairline px-6 py-3.5 text-[13px] font-bold uppercase tracking-wide hover:text-primary transition"
                    >
                      <Phone className="h-4 w-4" /> {PHONE_DISPLAY}
                    </a>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-5">
                <img
                  src={photoNavyCabana.url}
                  alt="Navy and white striped cabana umbrella beside a clean Frisco pool"
                  loading="eager"
                  fetchPriority="high"
                  className="w-full aspect-[4/5] object-cover rounded-sm border border-hairline"
                />
              </div>
            </div>
          </div>
        </section>

        {/* TRUST STRIP */}
        <section className="border-b border-hairline bg-secondary/30">
          <div className="container-tight grid grid-cols-2 md:grid-cols-4 divide-x divide-hairline">
            {[
              ["Frisco route day", "Fixed weekly"],
              ["Starting at", "$129.99 / month"],
              ["Photo report", "Every visit"],
              ["Clear water", "Guaranteed"],
            ].map(([label, value]) => (
              <div key={label} className="py-6 px-4 text-center">
                <div className="font-tech text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{label}</div>
                <div className="font-display text-[1.3rem] uppercase tracking-tight mt-1.5">{value}</div>
              </div>
            ))}
          </div>
        </section>

        {/* SERVICES */}
        <section className="perf-section py-16 sm:py-20 border-b border-hairline">
          <div className="container-tight">
            <h2 className="font-display text-[1.9rem] sm:text-[2.6rem] uppercase tracking-tight leading-none">
              What Frisco pools get<span className="text-accent">.</span>
            </h2>
            <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">
              {SERVICES.map((s) => (
                <div key={s.no} className="border-t border-hairline pt-5 flex gap-4">
                  <span className="font-tech text-[11px] text-accent pt-1">{s.no}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <s.icon className="h-4 w-4 text-amber-brand" />
                      <h3 className="font-display text-[1.15rem] uppercase tracking-tight">{s.title}</h3>
                    </div>
                    <p className="mt-2 text-muted-foreground text-[0.95rem] leading-relaxed">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* NEIGHBORHOODS + PHOTOS */}
        <section className="perf-section py-16 sm:py-20 border-b border-hairline">
          <div className="container-tight grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-6">
              <h2 className="font-display text-[1.9rem] sm:text-[2.4rem] uppercase tracking-tight leading-none">
                Frisco neighborhoods we run<span className="text-accent">.</span>
              </h2>
              <p className="mt-4 text-muted-foreground leading-relaxed max-w-lg">
                Our Frisco route covers the full city — from Preston Road out to the Legacy corridor
                and north past Panther Creek. If your street isn't listed, call and we'll tell you
                straight whether we can hit it on the weekly run.
              </p>
              <ul className="mt-6 grid grid-cols-2 gap-x-6 gap-y-2.5">
                {NEIGHBORHOODS.map((n) => (
                  <li key={n} className="flex items-center gap-2 text-[0.92rem]">
                    <CheckCircle2 className="h-4 w-4 text-amber-brand flex-shrink-0" /> {n}
                  </li>
                ))}
              </ul>
            </div>
            <div className="lg:col-span-6 grid grid-cols-2 gap-3">
              <img src={photoRivieraLoungers.url} alt="Red and white striped loungers beside a Frisco backyard pool" loading="lazy" className="w-full aspect-square object-cover rounded-sm border border-hairline" />
              <img src={photoSavvyLetters.url} alt="Savvy Swim inflatable letters floating in clear pool water" loading="lazy" className="w-full aspect-square object-cover rounded-sm border border-hairline mt-8" />
              <img src={photoRedUmbrellas.url} alt="Red and white umbrellas above a serviced pool deck" loading="lazy" className="w-full aspect-square object-cover rounded-sm border border-hairline" />
              <div className="border border-hairline rounded-sm p-5 flex flex-col justify-center mt-8">
                <div className="font-tech text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Guarantee</div>
                <p className="mt-2 text-[0.9rem] leading-relaxed">
                  Water not clear after a visit? We come back <strong>free, same day</strong>.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="perf-section py-16 sm:py-20 border-b border-hairline">
          <div className="container-tight max-w-3xl">
            <h2 className="font-display text-[1.9rem] sm:text-[2.4rem] uppercase tracking-tight leading-none">
              Frisco questions<span className="text-accent">.</span>
            </h2>
            <div className="mt-8 divide-y divide-hairline border-t border-hairline">
              {FAQ.map((f) => (
                <div key={f.q} className="py-5">
                  <h3 className="font-display text-[1.05rem] uppercase tracking-tight">{f.q}</h3>
                  <p className="mt-2 text-muted-foreground leading-relaxed">{f.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="perf-section py-16 sm:py-24">
          <div className="container-tight">
            <div className="border border-hairline rounded-sm p-8 sm:p-12 flex flex-col sm:flex-row sm:items-center gap-8 justify-between">
              <div>
                <h2 className="font-display text-[1.8rem] sm:text-[2.4rem] uppercase tracking-tight leading-none">
                  Book pool cleaning in Frisco
                </h2>
                <p className="mt-3 text-muted-foreground max-w-md">
                  Free walkthrough, flat monthly quote, and your first service on the next Frisco route day.
                </p>
              </div>
              <div className="flex gap-3 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setBookingOpen(true)}
                  className="btn-quote inline-flex items-center gap-2 rounded-md px-6 py-3.5 text-[13px] font-bold uppercase tracking-wide transition"
                >
                  Request Quote
                </button>
                <a
                  href={PHONE_HREF}
                  onClick={() => trackContactClick("call_click", "frisco_final_cta")}
                  className="inline-flex items-center gap-2 rounded-md border border-hairline px-6 py-3.5 text-[13px] font-bold uppercase tracking-wide hover:text-primary transition"
                >
                  <Phone className="h-4 w-4" /> Call
                </a>
                <a
                  href={SMS_HREF}
                  onClick={() => trackContactClick("text_click", "frisco_final_cta_hail")}
                  className="inline-flex items-center gap-2 rounded-md border border-hairline px-6 py-3.5 text-[13px] font-bold uppercase tracking-wide hover:text-primary transition"
                >
                  <MessageSquare className="h-4 w-4" /> Text hail damage inspection
                </a>
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
            <a href={PHONE_HREF} onClick={() => trackContactClick("call_click", "frisco_footer")} className="hover:text-foreground transition">{PHONE_DISPLAY}</a>
            <a href="https://www.instagram.com/hi.savvyswim?igsh=a2g5eWpndHA0Zm5j&amp;utm_source=qr" target="_blank" rel="noopener noreferrer" aria-label="Savvy Swim on Instagram" className="inline-flex items-center gap-1.5 hover:text-foreground transition"><Instagram className="h-4 w-4" />Instagram</a>
            <Link to="/privacy-policy" className="hover:text-foreground transition">Privacy Policy</Link>
            <Link to="/terms-and-conditions" className="hover:text-foreground transition">Terms &amp; Conditions</Link>
          </div>
        </div>
      </footer>

      <BookingDialog open={bookingOpen} onOpenChange={setBookingOpen} defaultService="Weekly Pool Cleaning" />
    </div>
  );
};

export default FriscoPoolCleaning;
