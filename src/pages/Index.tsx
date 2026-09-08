import { ArrowRight, CalendarCheck, Mail, MapPin, MessageSquare, Phone, Star } from "lucide-react";
import { useLoaderData } from "@tanstack/react-router";

import Seo from "@/components/Seo";
import ScrollReveal from "@/components/ScrollReveal";
import ServiceAreaMap from "@/components/ServiceAreaMap";
import BusinessInfoCard from "@/components/BusinessInfoCard";
import { Link } from "@/lib/router-compat";
import {
  EMAIL,
  PHONE_DISPLAY,
  PHONE_HREF,
  SMS_PHONE,
  SiteFooter,
  SiteHeader,
} from "@/components/SiteChrome";
import { StickyCallBar, onCallClick } from "@/components/CallButton";
import { buildSmsHref, trackContactClick } from "@/lib/contactTracking";
import { goToLead } from "@/lib/site-analytics";
import type { PublicReview } from "@/lib/reviews.functions";

import CityTicker from "@/components/CityTicker";
import { pool_water_hd_jpg as photoPoolWater } from "@/assets/photos";
import { IMG_5512_PNG as photoLifeguardChair } from "@/assets/photos";
import { IMG_5518_PNG as photoSavvyRings } from "@/assets/photos";
import { IMG_5503_jpg as photoRescueTube } from "@/assets/photos";
import { imgProps } from "@/lib/img";
import type { Photo } from "@/assets/photos";

/** The three photos beside the wordmark at the top of the page. */
const HERO_PHOTOS: { photo: Photo; alt: string }[] = [
  {
    photo: photoLifeguardChair,
    alt: "Savvy Swim umbrella and lifeguard chair beside a clean backyard pool",
  },
  { photo: photoSavvyRings, alt: "Red and white Savvy Swim ring floats on the water" },
  { photo: photoRescueTube, alt: "Red Savvy Swim rescue tube on the pool deck" },
];

/** Short promises listed under the wordmark. */


/** The four things we sell. Each card opens the page that breaks down the cost. */
const OFFERS: {
  title: string;
  blurb: string;
  price: string;
  to: string;
  hash?: string;
}[] = [
  {
    title: "Savvy Swim Club",
    blurb: "Member discounts on cleans, services and parts, plus 24/7 text support.",
    price: "$19.99 / month",
    to: "/services",
    hash: "membership",
  },
  {
    title: "Weekly pool service",
    blurb: "Cleaning, chemicals and equipment checks, with a photo report every visit.",
    price: "From $129.99 / month",
    to: "/weekly-pool-service",
  },
  {
    title: "Service & repair",
    blurb: "Pumps, filters, heaters, salt cells and automation, fixed by our own techs.",
    price: "Quoted after a free inspection",
    to: "/services",
  },
  {
    title: "Green pool recovery",
    blurb: "Algae or a pool left too long, brought back to swim-ready water.",
    price: "Quoted after a free inspection",
    to: "/services",
  },
];

const STEPS = [
  { n: "01", t: "Free water test", d: "We test the water, check the equipment, and quote on the spot." },
  { n: "02", t: "Pick your plan", d: "Weekly, bi-weekly, or a one-time cleanup. No contracts." },
  { n: "03", t: "Same tech, same day", d: "Skim, brush, vacuum, balance and filter check every visit." },
  { n: "04", t: "Photo report", d: "Chemistry readings and photos texted or emailed before we leave." },
];

const REVIEWS = [
  { q: "Our green pool was swimmable in four days. I still can't believe the before and after.", a: "Megan R.", c: "Plano, TX" },
  { q: "Tech showed up on time, replaced the pump motor same day, and texted me photos of the work.", a: "Daniel K.", c: "Frisco, TX" },
  { q: "Weekly service is flawless. I haven't touched a chemical in two years and the water looks like glass.", a: "Priya S.", c: "Southlake, TX" },
  { q: "They diagnosed a leak two other companies missed. Repair was clean and priced fair.", a: "Chris B.", c: "Fort Worth, TX" },
  { q: "Photo report after every visit. I always know exactly what was done.", a: "Marcus T.", c: "Arlington, TX" },
  { q: "Heater stopped working mid-winter, they had it running again in one visit.", a: "Jenna W.", c: "McKinney, TX" },
];

type ShownReview = { q: string; a: string; c: string; rating: number };

const Index = () => {
  const loaderData = useLoaderData({ from: "/", structuralSharing: false }) as
    | { reviews?: PublicReview[] }
    | undefined;
  const live: PublicReview[] = loaderData?.reviews ?? [];

  const shown: ShownReview[] = live.length
    ? live.map((r) => ({
        q: r.body,
        a: r.author_name,
        c: r.author_city ?? "",
        rating: r.rating,
      }))
    : REVIEWS.map((r) => ({ ...r, rating: 5 }));

  const reviewSchema = live.length
    ? {
        "@context": "https://schema.org",
        "@type": "LocalBusiness",
        name: "Savvy Swim",
        url: "https://savvyswimservices.com",
        aggregateRating: {
          "@type": "AggregateRating",
          ratingValue: (
            live.reduce((sum, r) => sum + r.rating, 0) / live.length
          ).toFixed(1),
          reviewCount: live.length,
        },
        review: live.map((r) => ({
          "@type": "Review",
          reviewRating: { "@type": "Rating", ratingValue: r.rating, bestRating: 5 },
          author: { "@type": "Person", name: r.author_name },
          reviewBody: r.body,
          datePublished: r.created_at.slice(0, 10),
        })),
      }
    : {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: "Savvy Swim",
        url: "https://savvyswimservices.com",
      };

  return (
    <div className="min-h-screen overflow-x-hidden">
      <Seo
        title="Savvy Swim | Pool Cleaning, Service & Repair in Texas"
        description="Weekly pool cleaning, maintenance, equipment service and repair across DFW. Free inspection from Savvy Swim, a Santana & Rivera company."
        path="/"
        jsonLd={reviewSchema}
      />


      <SiteHeader />
      <ScrollReveal />

      <CityTicker />

      <main>
        {/* 1 · WHO WE ARE */}
        <section id="who" className="border-b border-hairline bg-background">
          <div className="container-tight py-14 sm:py-20 lg:py-24">
            <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-12">
              <div className="min-w-0">
                <h1 className="font-display uppercase leading-[0.82] tracking-[-0.02em] text-accent">
                  <span className="sr-only">
                    Savvy Swim, pool cleaning and service in DFW
                  </span>
                  <span
                    aria-hidden
                    className="block"
                    style={{ fontSize: "clamp(3.2rem, 12vw, 9rem)" }}
                  >
                    <span className="block">Savvy</span>
                    <span className="block">Swim</span>
                  </span>
                </h1>

                <p className="mt-4 font-display text-[1.05rem] uppercase tracking-tight text-accent/70 sm:text-[1.45rem]">
                  Pool cleaning &amp; service in DFW
                </p>

                {/* Photos ride under the wordmark on phones, beside it on desktop. */}
                <div className="mt-7 -mx-5 flex gap-3 overflow-x-auto px-5 pb-1 lg:hidden">
                  {HERO_PHOTOS.map((p, i) => (
                    <img
                      key={p.alt}
                      {...imgProps(p.photo, { sizes: "128px", priority: i === 0 })}
                      alt={p.alt}
                      className="h-40 w-32 shrink-0 rounded-sm object-cover"
                    />
                  ))}
                </div>

                <div className="mt-8 border-t border-hairline pt-7">
                  <p className="max-w-xl text-[1.05rem] leading-relaxed sm:text-[1.15rem]">
                    Weekly pool cleaning, equipment service, and repair across
                    Dallas and Fort Worth.
                  </p>
                </div>


                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <button
                    type="button"
                    onClick={() => goToLead("home_hero")}
                    data-savvy-cta="request_quote"
                    aria-label="Book a free consultation, opens the Savvy Swim booking form"
                    className="btn-quote font-tech inline-flex min-h-12 items-center justify-center gap-2 px-7 py-3.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  >
                    <CalendarCheck className="h-4 w-4" aria-hidden="true" /> Book a free
                    consultation
                  </button>
                  <a
                    href={PHONE_HREF}
                    onClick={onCallClick("hero")}
                    aria-label={`Call Savvy Swim at ${PHONE_DISPLAY}`}
                    className="font-tech inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-hairline px-7 py-3.5 transition-colors hover:bg-ink-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  >
                    <Phone className="h-4 w-4" aria-hidden="true" /> {PHONE_DISPLAY}
                  </a>
                </div>
              </div>

              <div className="hidden grid-cols-3 gap-3 lg:grid lg:w-[27rem] xl:w-[32rem]">
                {HERO_PHOTOS.map((p, i) => (
                  <img
                    key={p.alt}
                    {...imgProps(p.photo, { sizes: "11rem", priority: i === 0 })}
                    alt={p.alt}
                    className="aspect-3/4 w-full rounded-sm object-cover"
                  />
                ))}
              </div>
            </div>
          </div>
        </section>


        {/* 2 · WHAT WE OFFER */}
        <section id="offer" data-reveal className="border-b border-hairline py-20 sm:py-24">
          <div className="container-tight">
            <div className="font-tech text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
              WHAT WE OFFER
            </div>
            <h2 className="mt-3 text-[1.9rem] font-semibold leading-tight tracking-tight sm:text-[2.5rem]">
              Pick a service to see what it costs.
            </h2>

            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              {OFFERS.map((o) => (
                <Link
                  key={o.title}
                  to={o.to}
                  {...(o.hash ? { hash: o.hash } : {})}
                  className="card-3d group flex flex-col rounded-sm p-7 transition hover:border-accent"
                >
                  <h3 className="text-xl font-semibold">{o.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{o.blurb}</p>
                  <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-amber-brand">
                    {o.price}
                    <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* 3 · HOW IT HAPPENS */}
        <section id="how" data-reveal className="border-b border-hairline bg-ink/40 py-20 sm:py-24">
          <div className="container-tight">
            <div className="font-tech text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
              HOW IT HAPPENS
            </div>
            <h2 className="mt-3 text-[1.9rem] font-semibold leading-tight tracking-tight sm:text-[2.5rem]">
              Four steps, then you stop thinking about it.
            </h2>

            <ol className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {STEPS.map((s) => (
                <li key={s.n} className="card-3d rounded-sm p-6">
                  <span className="font-display text-[13px] text-accent">{s.n}</span>
                  <div className="mt-2 font-semibold">{s.t}</div>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{s.d}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* 4 · WHY PEOPLE GO SAVVY */}
        <section id="why" data-reveal className="border-b border-hairline py-20 sm:py-24">
          <div className="container-tight">
            <div className="font-tech text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
              WHY PEOPLE GO SAVVY
            </div>
            <h2 className="mt-3 text-[1.9rem] font-semibold leading-tight tracking-tight sm:text-[2.5rem]">
              Neighbors across DFW.
            </h2>

            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {shown.map((t, i) => (
                <figure key={`${t.a}-${i}`} className="card-3d flex flex-col rounded-sm p-6">
                  <div
                    className="mb-4 flex items-center gap-1"
                    aria-label={`${t.rating} out of five stars`}
                  >
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`h-4 w-4 ${
                          s <= t.rating
                            ? "fill-amber-brand text-amber-brand"
                            : "text-muted-foreground/35"
                        }`}
                      />
                    ))}
                  </div>
                  <blockquote className="text-sm leading-relaxed text-foreground/90">
                    &ldquo;{t.q}&rdquo;
                  </blockquote>
                  <figcaption className="mt-5 flex items-center gap-3 border-t border-hairline pt-4">
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-amber-brand/15 text-sm font-bold text-amber-brand">
                      {t.a[0]}
                    </span>
                    <span>
                      <span className="block text-sm font-semibold">{t.a}</span>
                      {t.c && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" /> {t.c}
                        </span>
                      )}
                    </span>
                  </figcaption>
                </figure>
              ))}
            </div>

            <div className="mt-10 flex flex-wrap items-center gap-6">
              <Link
                to="/our-work"
                className="inline-flex items-center gap-2 text-sm font-semibold text-amber-brand underline underline-offset-4"
              >
                See our work <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/leave-a-review"
                className="inline-flex items-center gap-2 text-sm font-semibold text-amber-brand underline underline-offset-4"
              >
                Leave a review <Star className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* 5 · CONTACT */}
        <section id="contact" data-reveal className="py-20 sm:py-24">
          <div className="container-tight">
            <div className="font-tech text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
              CONNECT WITH US
            </div>
            <h2 className="mt-3 text-[1.9rem] font-semibold leading-tight tracking-tight sm:text-[2.5rem]">
              Ready when you are.
            </h2>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <button
                type="button"
                onClick={() => goToLead("home_contact")}
                data-savvy-cta="request_quote"
                className="btn-quote inline-flex min-h-12 items-center justify-center gap-2 rounded-md px-7 py-3.5 text-sm font-bold uppercase tracking-wide"
              >
                <CalendarCheck className="h-4 w-4" aria-hidden="true" /> Book a free consultation
              </button>
              <a
                href={PHONE_HREF}
                onClick={onCallClick("contact")}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-hairline px-7 py-3.5 text-sm font-semibold transition hover:bg-ink-soft"
              >
                <Phone className="h-4 w-4" /> {PHONE_DISPLAY}
              </a>
              <a
                href={buildSmsHref(SMS_PHONE)}
                onClick={() => trackContactClick("text_click", "home_contact_text")}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-hairline px-7 py-3.5 text-sm font-semibold transition hover:bg-ink-soft"
              >
                <MessageSquare className="h-4 w-4" /> Text us
              </a>
              <a
                href={`mailto:${EMAIL}`}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-hairline px-7 py-3.5 text-sm font-semibold transition hover:bg-ink-soft"
              >
                <Mail className="h-4 w-4" /> {EMAIL}
              </a>
            </div>

            <div className="mt-12">
              <ServiceAreaMap />
            </div>

            <div className="mt-8">
              <BusinessInfoCard />
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
      <StickyCallBar />
    </div>
  );
};

export default Index;
