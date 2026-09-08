import { Link } from "@/lib/router-compat";
import {
  Phone,
  Droplets,
  Wrench,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  MapPin,
  FlaskConical,
} from "lucide-react";
import { trackContactClick } from "@/lib/contactTracking";
import { CallButton, StickyCallBar, onCallClick } from "@/components/CallButton";
import { goToLead } from "@/lib/site-analytics";
import { buildCityFaq, SERVICE_AREAS, type ServiceArea } from "@/lib/serviceAreas";

import {
  IMG_5507_2_JPG as photoNavyCabana,
  IMG_5504_2_JPG as photoRivieraLoungers,
  IMG_5512_PNG as photoSavvyRings,
  pool_water_hd_jpg as photoWater,
} from "@/assets/photos";
import { imgProps } from "@/lib/img";

const PHONE_DISPLAY = "817-663-POOL";
const PHONE_HREF = "tel:+18176637665";

export default function CityLanding({ area }: { area: ServiceArea }) {
  const city = area.name;
  const local = area.local;

  const services = [
    {
      no: "01",
      icon: Droplets,
      title: `Weekly pool cleaning in ${city}`,
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
      desc: "Pumps, filters, heaters, salt cells, and automation. Most parts are stocked on the truck, so repairs usually finish in one trip.",
    },
    {
      no: "04",
      icon: ShieldCheck,
      title: "Hard-water & scale care",
      desc: "DFW hard water leaves calcium at the waterline. We treat scale, keep tile clean, and manage calcium hardness all year.",
    },
  ];

  const faq = buildCityFaq(area);

  const nearby = SERVICE_AREAS.filter((a) => a.slug !== area.slug)
    .slice(0, 6)
    .map((a) => ({ name: a.name, to: `/${a.slug}` }));

  const gallery = [
    { photo: photoWater, alt: `Balanced, clear pool water on a ${city}, Texas weekly service route` },
    { photo: photoRivieraLoungers, alt: `Striped loungers beside a serviced ${city}, Texas backyard pool` },
    { photo: photoSavvyRings, alt: `Savvy Swim rings floating in a clean ${city}, Texas pool` },
  ];


  return (
    <div className="min-h-screen overflow-x-hidden">
      <header className="border-b border-hairline bg-background">
        <div className="container-tight flex h-[64px] items-center justify-between gap-3 sm:h-[76px] sm:gap-4">
          <Link to="/" aria-label="Savvy Swim home" className="flex min-w-0 shrink items-center gap-3">
            <span className="whitespace-nowrap font-display text-[1.15rem] uppercase leading-none tracking-tight text-accent xs:text-[1.3rem] sm:text-[1.6rem] lg:text-[1.9rem]">
              Savvy Swim
            </span>
          </Link>
          <nav className="hidden min-w-0 flex-1 items-center justify-center gap-4 overflow-hidden whitespace-nowrap font-tech text-primary/70 md:flex lg:gap-7">
            <Link to="/" className="shrink-0 hover:text-accent transition">Home</Link>
            <Link to="/services" className="shrink-0 hover:text-accent transition">Services</Link>
            <Link to="/services" hash="membership" className="shrink-0 hover:text-accent transition">Swim Club</Link>
            <Link to="/" hash="contact" className="shrink-0 hover:text-accent transition">Contact</Link>
          </nav>
          <CallButton location={`${area.slug}_header`} />
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
                    <MapPin className="h-3.5 w-3.5" /> {city}, Texas · {area.zips}
                  </div>
                  <h1 className="font-display uppercase leading-[0.94] tracking-tight" style={{ fontSize: "clamp(2.2rem, 5.4vw, 4.2rem)" }}>
                    Pool cleaning<br />
                    <span className="text-accent">{city}, TX.</span>
                  </h1>
                  <p className="mt-6 max-w-xl text-muted-foreground text-base leading-relaxed">{area.intro}</p>
                  <p className="mt-4 font-serif italic text-xl text-foreground/80">
                    On duty, so you don't have to be.
                  </p>
                  <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                    <button
                      type="button"
                      onClick={() => goToLead(`city_${area.slug}`)}
                  data-savvy-cta="request_quote"
                      className="btn-quote inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-md px-6 py-3.5 sm:w-auto text-[13px] font-bold uppercase tracking-wide transition"
                    >
                      Get a {city} quote
                    </button>
                    <a
                      href={PHONE_HREF}
                      onClick={onCallClick(`${area.slug}_hero`)}
                      className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-md border border-hairline px-6 py-3.5 sm:w-auto text-[13px] font-bold uppercase tracking-wide hover:text-primary transition"
                    >
                      <Phone className="h-4 w-4" /> {PHONE_DISPLAY}
                    </a>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-5">
                <img
                  {...imgProps(photoNavyCabana, {
                    priority: true,
                    sizes: "(min-width: 1024px) 40vw, 100vw",
                  })}
                  alt={`Striped cabana umbrella beside a clean ${city}, Texas pool`}
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
              [`${city} route day`, "Fixed weekly"],
              ["Starting at", area.startingPrice],
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
              What {city} pools get<span className="text-accent">.</span>
            </h2>
            <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">
              {services.map((s) => (
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

        {local && (
          <>
            {/* LOCAL WATER */}
            <section className="perf-section py-16 sm:py-20 border-b border-hairline">
              <div className="container-tight">
                <div className="flex items-center gap-2 font-tech text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
                  <FlaskConical className="h-3.5 w-3.5" /> Local water report
                </div>
                <h2 className="mt-4 font-display text-[1.9rem] sm:text-[2.6rem] uppercase tracking-tight leading-none">
                  {city} water &amp; scale<span className="text-accent">.</span>
                </h2>
                <p className="mt-4 max-w-2xl text-muted-foreground leading-relaxed">{local.waterHeadline}</p>
                <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">
                  {local.waterNotes.map((n) => (
                    <div key={n.title} className="border-t border-hairline pt-5">
                      <h3 className="font-display text-[1.15rem] uppercase tracking-tight">{n.title}</h3>
                      <p className="mt-2 text-muted-foreground text-[0.95rem] leading-relaxed">{n.body}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>


            {/* INCLUSIONS */}
            <section className="perf-section py-16 sm:py-20 border-b border-hairline">
              <div className="container-tight">
                <h2 className="font-display text-[1.9rem] sm:text-[2.6rem] uppercase tracking-tight leading-none">
                  What's included in {city}<span className="text-accent">.</span>
                </h2>
                <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-x-10 gap-y-10">
                  {local.inclusions.map((g) => (
                    <div key={g.group} className="border-t border-hairline pt-5">
                      <h3 className="font-display text-[1.05rem] uppercase tracking-tight">{g.group}</h3>
                      <ul className="mt-4 space-y-2.5">
                        {g.items.map((item) => (
                          <li key={item} className="flex gap-2 text-[0.92rem] leading-relaxed">
                            <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-brand" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* GALLERY */}
            <section className="perf-section py-16 sm:py-20 border-b border-hairline">
              <div className="container-tight">
                <h2 className="font-display text-[1.9rem] sm:text-[2.4rem] uppercase tracking-tight leading-none">
                  {city} pools we keep<span className="text-accent">.</span>
                </h2>
                <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {gallery.map((g) => (
                    <img
                      key={g.alt}
                      {...imgProps(g.photo, { sizes: "(min-width: 640px) 33vw, 100vw" })}
                      alt={g.alt}
                      className="w-full aspect-[4/3] object-cover rounded-sm border border-hairline"
                    />
                  ))}
                </div>
              </div>
            </section>
          </>
        )}


        {/* NEIGHBORHOODS */}
        <section className="perf-section py-16 sm:py-20 border-b border-hairline">
          <div className="container-tight max-w-3xl">
            <h2 className="font-display text-[1.9rem] sm:text-[2.4rem] uppercase tracking-tight leading-none">
              {city} neighborhoods we run<span className="text-accent">.</span>
            </h2>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              Our {city} route covers the full city. If your street isn't listed, call and we'll tell
              you straight whether we can hit it on the weekly run.
            </p>
            <ul className="mt-6 grid grid-cols-2 gap-x-6 gap-y-2.5">
              {area.neighborhoods.map((n) => (
                <li key={n} className="flex items-center gap-2 text-[0.92rem]">
                  <CheckCircle2 className="h-4 w-4 text-amber-brand flex-shrink-0" /> {n}
                </li>
              ))}
            </ul>

            <p className="mt-8 text-sm text-muted-foreground">
              New to weekly service?{" "}
              <Link to="/weekly-pool-service" className="text-accent underline underline-offset-4">
                See exactly what a weekly pool visit includes
              </Link>
              .
            </p>

            <div className="mt-8 border-t border-hairline pt-6">
              <div className="font-tech text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
                Nearby service areas
              </div>
              <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-[0.92rem]">
                {nearby.map((n: { name: string; to: string }) => (
                  <li key={n.to}>
                    <Link to={n.to} className="hover:text-accent transition underline underline-offset-4 decoration-hairline">
                      Pool service in {n.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>


        {/* FAQ */}
        <section className="perf-section py-16 sm:py-20 border-b border-hairline">
          <div className="container-tight max-w-3xl">
            <h2 className="font-display text-[1.9rem] sm:text-[2.4rem] uppercase tracking-tight leading-none">
              {city} questions<span className="text-accent">.</span>
            </h2>
            <div className="mt-8 divide-y divide-hairline border-t border-hairline">
              {faq.map((f) => (
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
                  Book a free {city} pool inspection
                </h2>
                <p className="mt-3 text-muted-foreground max-w-md">
                  A tech walks the pool and equipment pad, tests the water, and gives you a flat
                  monthly quote. No charge, no contract, first service on the next {city} route day.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <button
                  type="button"
                  onClick={() => goToLead(`city_${area.slug}`)}
                  data-savvy-cta="request_quote"
                  className="btn-quote inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-md px-6 py-3.5 sm:w-auto text-[13px] font-bold uppercase tracking-wide transition"
                >
                  Book a free consultation
                </button>
                <button
                  type="button"
                  onClick={() => goToLead(`city_${area.slug}`)}
                  data-savvy-cta="request_quote"
                  className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-md border border-hairline px-6 py-3.5 sm:w-auto text-[13px] font-bold uppercase tracking-wide hover:text-primary transition"
                >
                  Request a quote
                </button>
                <a
                  href={PHONE_HREF}
                  onClick={onCallClick(`${area.slug}_cta`)}
                  className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-md border border-hairline px-6 py-3.5 sm:w-auto text-[13px] font-bold uppercase tracking-wide hover:text-primary transition"
                >
                  <Phone className="h-4 w-4" /> {PHONE_DISPLAY}
                </a>
              </div>

            </div>
          </div>
        </section>
      </main>

      <StickyCallBar />
      </div>
  );
}
