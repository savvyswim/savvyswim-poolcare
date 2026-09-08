import { useState } from "react";
import { INSTAGRAM_URL } from "@/lib/contact-info";
import { Link } from "@/lib/router-compat";
import { Instagram, Waves, Phone, Droplets, Wrench, Sparkles, ShieldCheck, CheckCircle2, MapPin, MessageSquare } from "lucide-react";
import Seo from "@/components/Seo";
import { buildSmsHref, trackContactClick } from "@/lib/contactTracking";
import { CallButton, StickyCallBar, onCallClick } from "@/components/CallButton";
import { goToLead } from "@/lib/site-analytics";
import InlineLeadForm from "@/components/InlineLeadForm";

import { imgProps } from "@/lib/img";
import { IMG_5507_2_JPG as photoNavyCabana } from "@/assets/photos";
import { IMG_5508_2_JPG as photoRivieraLoungers } from "@/assets/photos";
import { IMG_5502_PNG as photoSavvyLetters } from "@/assets/photos";
import { IMG_5497_2_jpg as photoRedUmbrellas } from "@/assets/photos";

const PHONE_DISPLAY = "817-663-POOL";
const PHONE_HREF = "tel:+18176637665";
const EMAIL = "hi@savvyswim.com";
const SMS_PHONE = "+18176637665";

const NEIGHBORHOODS = [
  "Starwood", "Newman Village", "Phillips Creek Ranch", "Panther Creek",
  "Frisco Lakes", "Stonebriar", "The Trails", "Richwoods", "Preston Vineyards",
];

const SERVICES = [
  {
    no: "01",
    icon: Droplets,
    title: "Weekly pool cleaning in Frisco",
    desc: "Skim, brush, vacuum, empty baskets, and balance chemistry every week, with a photo report before we leave the driveway.",
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
    desc: "Pumps, filters, heaters, salt cells, and automation. Most parts stocked on the truck, so Frisco repairs usually finish in one trip.",
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
    a: "Frisco weekly service starts at $129.99 a month, including chemicals. Size, spa, and pool condition set the final number. We quote flat after a walkthrough, and the price does not change week to week.",
  },
  {
    q: "What day do you service Frisco pools?",
    a: "Frisco runs on a fixed weekly route day with the same assigned technician. You get an on-my-way text before arrival and a photo report with chemistry readings after every visit.",
  },
  {
    q: "Do I have to be home?",
    a: "No. We work around gate codes, dogs, and locked side yards. That's the whole point of on duty, so you don't have to be. Everything you need to see shows up in the visit report.",
  },
  {
    q: "What if the water isn't clear after a visit?",
    a: "We come back free, same day, if it's our fault. If landscaping, a storm, or a third party caused it, you still get one complimentary return visit.",
  },
];

const FriscoPoolCleaning = () => {

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Service",
      name: "Pool Cleaning Frisco TX",
      serviceType: "Pool cleaning and maintenance",
      provider: {
        "@type": "LocalBusiness",
        name: "Savvy Swim",
        telephone: "+1-817-663-7665",
        email: EMAIL,
        url: "https://savvyswimservices.com",
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
        title="Pool Cleaning Frisco TX | Weekly Service | Savvy Swim"
        description="Pool cleaning in Frisco, TX from $129.99/mo. Weekly chemistry, cleaning, and equipment checks with a photo report every visit. Same tech, same day, no contracts."
        path="/pool-cleaning-frisco-tx"
        jsonLd={jsonLd}
      />

      <header className="border-b border-hairline bg-background">
        <div className="container-tight flex h-[64px] items-center justify-between gap-3 sm:h-[76px] sm:gap-4">
          <Link to="/" aria-label="Savvy Swim home" className="flex min-w-0 shrink items-center gap-3">
            <span className="whitespace-nowrap font-display text-[1.15rem] uppercase leading-none tracking-tight text-accent xs:text-[1.3rem] sm:text-[1.6rem] lg:text-[1.9rem]">
              Savvy Swim
            </span>
            <span aria-hidden="true" className="hidden whitespace-nowrap font-tech text-[9px] leading-tight text-primary/60 lg:block xl:hidden">
              On duty, so you don&rsquo;t have to be.
            </span>
          </Link>
          <nav className="hidden min-w-0 flex-1 items-center justify-center gap-4 overflow-hidden whitespace-nowrap font-tech text-primary/70 md:flex lg:gap-7">
            <Link to="/" className="shrink-0 hover:text-accent transition">Home</Link>
            <Link to="/services" className="shrink-0 hover:text-accent transition">Services</Link>
            <Link to="/services" hash="membership" className="shrink-0 hover:text-accent transition">Swim Club</Link>
            <Link to="/" hash="contact" className="shrink-0 hover:text-accent transition">Contact</Link>
          </nav>
          <CallButton location="frisco_header" />
        </div>
      </header>

      <main>
        {/* HERO */}
        <section className="border-b border-hairline">
          <div className="container-tight py-10 sm:py-16 lg:py-20">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-end">
              <div className="lg:col-span-7">
                <div className="border-t-2 border-accent pt-6">
                  <div className="mb-4 flex flex-wrap items-center gap-x-2 gap-y-1 font-tech text-[10px] uppercase leading-relaxed tracking-[0.18em] text-muted-foreground sm:text-[11px] sm:tracking-[0.24em]">
                    <MapPin className="h-3.5 w-3.5 shrink-0" /> <span>Frisco, Texas</span> <span aria-hidden="true">·</span> <span>75033 / 75034 / 75035 / 75036</span>
                  </div>
                  <h1 className="font-display uppercase leading-[0.94] tracking-tight" style={{ fontSize: "clamp(2.4rem, 10vw, 4.2rem)" }}>
                    Pool cleaning<br />
                    <span className="text-accent">Frisco, TX.</span>
                  </h1>
                  <p className="mt-5 max-w-xl text-[0.98rem] leading-relaxed text-muted-foreground sm:mt-6 sm:text-base">
                    Weekly pool cleaning for Frisco homeowners, chemistry balanced, baskets emptied,
                    equipment checked, and a photo report in your inbox before we pull out of the driveway.
                  </p>
                  <p className="mt-4 font-serif text-lg italic text-foreground/80 sm:text-xl">
                    On duty, so you don't have to be.
                  </p>
                  <div className="mt-7 grid grid-cols-1 gap-3 sm:mt-8 sm:flex sm:flex-wrap">
                    <button
                      type="button"
                      onClick={() => goToLead("frisco")}
                      className="btn-quote inline-flex min-h-[52px] items-center justify-center gap-2 rounded-md px-6 py-3.5 text-[13px] font-bold uppercase tracking-wide transition"
                    >
                      Get a Frisco quote
                    </button>
                    <a
                      href={PHONE_HREF}
                      onClick={onCallClick("frisco_hero")}
                      className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-md border border-hairline px-6 py-3.5 text-[13px] font-bold uppercase tracking-wide transition hover:text-primary"
                    >
                      <Phone className="h-4 w-4 shrink-0" /> {PHONE_DISPLAY}
                    </a>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-5">
                <img
                  {...imgProps(photoNavyCabana, { priority: true, sizes: "(min-width: 1024px) 40vw, 100vw" })}
                  alt="Navy and white striped cabana umbrella beside a clean Frisco pool"
                  className="w-full rounded-sm border border-hairline object-cover aspect-[16/10] sm:aspect-[3/2] lg:aspect-[4/5]"
                />
              </div>
            </div>
          </div>
        </section>

        {/* TRUST STRIP */}
        <section className="border-b border-hairline bg-secondary/30">
          <div className="container-tight grid grid-cols-2 divide-x divide-y divide-hairline md:grid-cols-4 md:divide-y-0">
            {[
              ["Frisco route day", "Fixed weekly"],
              ["Starting at", "$129.99 / month"],
              ["Photo report", "Every visit"],
              ["Clear water", "Guaranteed"],
            ].map(([label, value]) => (
              <div key={label} className="px-3 py-5 text-center sm:px-4 sm:py-6">
                <div className="font-tech text-[9px] uppercase tracking-[0.16em] text-muted-foreground sm:text-[10px] sm:tracking-[0.2em]">{label}</div>
                <div className="mt-1.5 font-display text-[1.05rem] uppercase leading-tight tracking-tight sm:text-[1.3rem]">{value}</div>
              </div>
            ))}
          </div>
        </section>

        {/* SERVICES */}
        <section className="perf-section border-b border-hairline py-12 sm:py-20">
          <div className="container-tight">
            <h2 className="font-display text-[1.6rem] uppercase leading-none tracking-tight sm:text-[2.6rem]">
              What Frisco pools get<span className="text-accent">.</span>
            </h2>
            <div className="mt-8 grid grid-cols-1 gap-x-10 gap-y-7 sm:mt-10 md:grid-cols-2">
              {SERVICES.map((s) => (
                <div key={s.no} className="flex gap-3 border-t border-hairline pt-5 sm:gap-4">
                  <span className="shrink-0 pt-1 font-tech text-[11px] text-accent">{s.no}</span>
                  <div className="min-w-0">
                    <div className="flex items-start gap-2">
                      <s.icon className="mt-0.5 h-4 w-4 shrink-0 text-amber-brand" />
                      <h3 className="font-display text-[1.05rem] uppercase leading-tight tracking-tight sm:text-[1.15rem]">{s.title}</h3>
                    </div>
                    <p className="mt-2 text-muted-foreground text-[0.95rem] leading-relaxed">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* NEIGHBORHOODS + PHOTOS */}
        <section className="perf-section border-b border-hairline py-12 sm:py-20">
          <div className="container-tight grid grid-cols-1 items-center gap-8 lg:grid-cols-12 lg:gap-10">
            <div className="lg:col-span-6">
              <h2 className="font-display text-[1.6rem] uppercase leading-none tracking-tight sm:text-[2.4rem]">
                Frisco neighborhoods we run<span className="text-accent">.</span>
              </h2>
              <p className="mt-4 text-muted-foreground leading-relaxed max-w-lg">
                Our Frisco route covers the full city, from Preston Road out to the Legacy corridor
                and north past Panther Creek. If your street isn't listed, call and we'll tell you
                straight whether we can hit it on the weekly run.
              </p>
              <ul className="mt-6 grid grid-cols-1 gap-x-6 gap-y-2.5 xs:grid-cols-2">
                {NEIGHBORHOODS.map((n) => (
                  <li key={n} className="flex items-center gap-2 text-[0.9rem]">
                    <CheckCircle2 className="h-4 w-4 text-amber-brand flex-shrink-0" /> {n}
                  </li>
                ))}
              </ul>
            </div>
            <div className="grid grid-cols-2 gap-3 lg:col-span-6">
              <img {...imgProps(photoRivieraLoungers, { sizes: "(min-width: 640px) 33vw, 100vw" })} alt="Red and white striped loungers beside a Frisco backyard pool" className="w-full aspect-square object-cover rounded-sm border border-hairline" />
              <img {...imgProps(photoSavvyLetters, { sizes: "(min-width: 640px) 33vw, 100vw" })} alt="Savvy Swim inflatable letters floating in clear pool water" className="w-full aspect-square object-cover rounded-sm border border-hairline sm:mt-8" />
              <img {...imgProps(photoRedUmbrellas, { sizes: "(min-width: 640px) 33vw, 100vw" })} alt="Red and white umbrellas above a serviced pool deck" className="w-full aspect-square object-cover rounded-sm border border-hairline" />
              <div className="flex flex-col justify-center rounded-sm border border-hairline p-4 sm:mt-8 sm:p-5">
                <div className="font-tech text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Guarantee</div>
                <p className="mt-2 text-[0.9rem] leading-relaxed">
                  Water not clear after a visit? We come back <strong>free, same day</strong>.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="perf-section border-b border-hairline py-12 sm:py-20">
          <div className="container-tight max-w-3xl">
            <h2 className="font-display text-[1.6rem] uppercase leading-none tracking-tight sm:text-[2.4rem]">
              Frisco questions<span className="text-accent">.</span>
            </h2>
            <div className="mt-8 divide-y divide-hairline border-t border-hairline">
              {FAQ.map((f) => (
                <div key={f.q} className="py-5">
                  <h3 className="font-display text-[1rem] uppercase leading-tight tracking-tight sm:text-[1.05rem]">{f.q}</h3>
                  <p className="mt-2 text-[0.95rem] leading-relaxed text-muted-foreground">{f.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CONTACT FORM */}
        <section id="frisco-contact" className="perf-section border-b border-hairline py-12 sm:py-20">
          <div className="container-tight grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-12">
            <div className="lg:col-span-5">
              <h2 className="font-display text-[1.6rem] uppercase leading-none tracking-tight sm:text-[2.4rem]">
                Get a water test &amp; a complimentary inspection for your pool<span className="text-accent">.</span>
              </h2>
              <p className="mt-4 max-w-md text-[0.98rem] leading-relaxed text-muted-foreground">
                Send your details and a Frisco tech will call or text you back the same day to schedule your
                free water test and on-site pool inspection. Plus a flat monthly quote. No contracts, no pressure.
              </p>
              <ul className="mt-6 space-y-2.5 text-[0.92rem]">
                {["Free full water chemistry test", "Complimentary on-site pool inspection", "Same-day reply, flat monthly price with chemicals included"].map((t) => (
                  <li key={t} className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-amber-brand" /> {t}
                  </li>
                ))}
              </ul>

            </div>
            <div className="lg:col-span-7">
              <div className="rounded-sm border border-hairline bg-[#F9F8F4] p-5 sm:p-8">
                <InlineLeadForm cta="frisco_contact_form" source="frisco_page_contact_form" />
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="perf-section py-12 sm:py-24">
          <div className="container-tight">
            <div className="flex flex-col justify-between gap-7 rounded-sm border border-hairline p-6 sm:flex-row sm:items-center sm:gap-8 sm:p-12">
              <div>
                <h2 className="font-display text-[1.6rem] uppercase leading-none tracking-tight sm:text-[2.4rem]">
                  Book pool cleaning in Frisco
                </h2>
                <p className="mt-3 text-muted-foreground max-w-md">
                  Free walkthrough, flat monthly quote, and your first service on the next Frisco route day.
                </p>
              </div>
              <div className="grid w-full grid-cols-1 gap-3 sm:w-auto sm:flex-shrink-0 sm:grid-cols-2 lg:flex">
                <button
                  type="button"
                  onClick={() => goToLead("frisco")}
                  className="btn-quote inline-flex min-h-[52px] items-center justify-center gap-2 rounded-md px-6 py-3.5 text-[13px] font-bold uppercase tracking-wide transition"
                >
                  Request Quote
                </button>
                <a
                  href={PHONE_HREF}
                  onClick={onCallClick("frisco_final_cta")}
                  className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-md border border-hairline px-6 py-3.5 text-[13px] font-bold uppercase tracking-wide transition hover:text-primary"
                >
                  <Phone className="h-4 w-4 shrink-0" /> Call
                </a>
                <a
                  href={buildSmsHref(SMS_PHONE)}
                  onClick={() => trackContactClick("text_click", "frisco_final_cta_text")}
                  className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-md border border-hairline px-4 py-3.5 text-center text-[13px] font-bold uppercase tracking-wide transition hover:text-primary sm:col-span-2 lg:col-span-1"
                >
                  <MessageSquare className="h-4 w-4 shrink-0" /> <span className="sm:hidden">Text us</span><span className="hidden sm:inline">Text for a free pool quote</span>
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-hairline py-10 pb-28 md:pb-10">
        <div className="container-tight flex flex-col items-center justify-between gap-4 text-center text-xs text-muted-foreground sm:flex-row sm:text-left">
          <div className="flex items-center gap-2">
            <Waves className="h-4 w-4 text-amber-brand" />
            <span>© {new Date().getFullYear()} Savvy Swim · A Santana &amp; Rivera Company. All rights reserved.</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            <a href={`mailto:${EMAIL}`} className="hover:text-foreground transition">{EMAIL}</a>
            <a href={PHONE_HREF} onClick={onCallClick("frisco_footer")} className="hover:text-foreground transition">{PHONE_DISPLAY}</a>
            <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" aria-label="Savvy Swim on Instagram" className="inline-flex items-center gap-1.5 hover:text-foreground transition"><Instagram className="h-4 w-4" />Instagram</a>
            <Link to="/privacy-policy" className="hover:text-foreground transition">Privacy Policy</Link>
            <Link to="/terms-and-conditions" className="hover:text-foreground transition">Terms &amp; Conditions</Link>
          </div>
        </div>
      </footer>

      <StickyCallBar />
      </div>
  );
};

export default FriscoPoolCleaning;
