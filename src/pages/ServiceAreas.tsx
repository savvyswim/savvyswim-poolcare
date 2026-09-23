import { Link } from "@tanstack/react-router";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { StickyCallBar } from "@/components/CallButton";
import { BUSINESS_HOURS } from "@/lib/business-hours";
import { PHONE_HREF, PHONE_VANITY_WITH_DIGITS } from "@/lib/contact-info";
import { ADDITIONAL_SERVICE_CITIES } from "@/lib/service-locations";
import { PRICING_AREAS, priceOnly, SWIM_CLUB_PRICE } from "@/lib/city-pricing";
import { SERVICE_CATALOG } from "@/lib/structured-data";
import { trackContactClick } from "@/lib/contactTracking";

const EMAIL = "hi@savvyswim.com";

/**
 * Public local search page. One place that states who we are, what we do,
 * when we work, how to reach us and every city we run routes in. Every fact
 * reads from the same constants as the LocalBusiness structured data and the
 * business listing sheet, so the site and the directory listings cannot drift.
 */
export default function ServiceAreas() {
  return (
    <div className="min-h-screen overflow-x-hidden">
      <SiteHeader />

      <main>
        <section className="container-tight py-16 sm:py-20">
          <div className="max-w-2xl">
            <div className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-amber-brand">
              Service areas and hours
            </div>
            <h1 className="text-[2rem] font-semibold leading-[1.12] tracking-tight sm:text-[2.6rem]">
              Pool service across Dallas-Fort Worth.
            </h1>
            <p className="mt-5 leading-relaxed text-muted-foreground">
              Savvy Swim is a mobile pool service company. There is no walk-in shop, our
              licensed techs drive to your pool on a set weekly route. Weekly cleaning,
              water chemistry, green pool recovery, filter cleans and equipment repair are
              all handled by the same crew, with a photo report after every visit.
            </p>
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            <div className="border border-hairline p-5">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <Phone className="h-4 w-4" aria-hidden="true" /> Call or text
              </p>
              <a
                href={PHONE_HREF}
                onClick={() => trackContactClick("call_click", "service_areas_page")}
                className="mt-2 block text-lg font-semibold underline-offset-4 hover:underline"
              >
                {PHONE_VANITY_WITH_DIGITS}
              </a>
            </div>

            <div className="border border-hairline p-5">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <Mail className="h-4 w-4" aria-hidden="true" /> Email
              </p>
              <a
                href={`mailto:${EMAIL}`}
                className="mt-2 block text-lg font-semibold underline-offset-4 hover:underline"
              >
                {EMAIL}
              </a>
            </div>

            <div className="border border-hairline p-5">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <MapPin className="h-4 w-4" aria-hidden="true" /> Where we work
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Mobile service across the Dallas-Fort Worth metroplex. We come to your pool.
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/schedule"
              className="border border-foreground bg-foreground px-5 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-background"
            >
              Book a free inspection
            </Link>
            <a
              href="/savvy-swim.vcf"
              download
              className="border border-foreground px-5 py-3 text-xs font-semibold uppercase tracking-[0.14em]"
            >
              Save our contact
            </a>
          </div>
        </section>

        <section
          aria-labelledby="hours-heading"
          className="border-t border-hairline py-14 sm:py-16"
        >
          <div className="container-tight grid gap-10 lg:grid-cols-2">
            <div>
              <h2
                id="hours-heading"
                className="flex items-center gap-2 font-display text-2xl uppercase tracking-[0.04em]"
              >
                <Clock className="h-5 w-5" aria-hidden="true" /> Service hours
              </h2>
              <dl className="mt-5 max-w-md space-y-2 text-sm">
                {BUSINESS_HOURS.map((row) => (
                  <div
                    key={row.label}
                    className="grid grid-cols-[minmax(0,1fr)_auto] gap-4 border-b border-hairline/60 pb-2 last:border-0"
                  >
                    <dt className="min-w-0 text-muted-foreground">{row.label}</dt>
                    <dd className="shrink-0 font-semibold tabular-nums">{row.display}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-4 text-sm text-muted-foreground">
                Sundays are closed, with the emergency line reserved for Swim Club members.
                Swim Club is {SWIM_CLUB_PRICE} on top of your service plan.
              </p>
            </div>

            <div>
              <h2 className="font-display text-2xl uppercase tracking-[0.04em]">
                What we do
              </h2>
              <ul className="mt-5 space-y-4">
                {SERVICE_CATALOG.map((s) => (
                  <li key={s.name} className="border-b border-hairline/60 pb-4 last:border-0">
                    <p className="text-sm font-semibold">
                      {s.name}
                      {s.price ? ` from $${s.price} / month` : ""}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">{s.description}</p>
                  </li>
                ))}
                <li>
                  <p className="text-sm font-semibold">Free water testing</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Bring us a sample or book a visit and we test free and total chlorine, pH,
                    alkalinity, cyanuric acid and calcium hardness, then tell you exactly what
                    your pool needs.
                  </p>
                </li>
              </ul>
            </div>
          </div>
        </section>

        <section
          aria-labelledby="cities-heading"
          className="border-t border-hairline py-14 sm:py-16"
        >
          <div className="container-tight">
            <h2
              id="cities-heading"
              className="font-display text-2xl uppercase tracking-[0.04em]"
            >
              Cities we run weekly routes in
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Pick your city for local pricing, neighborhoods we cover and a free inspection.
            </p>

            <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {PRICING_AREAS.map((area) => (
                <li key={area.slug} className="border border-hairline p-5">
                  <a
                    href={`/${area.slug}`}
                    className="font-display text-lg uppercase tracking-[0.04em] underline-offset-4 hover:underline"
                  >
                    {area.name}, TX
                  </a>
                  <p className="mt-1 text-xs text-muted-foreground">{area.zips}</p>
                  <p className="mt-3 text-sm">
                    Weekly service from{" "}
                    <span className="font-semibold">{priceOnly(area.startingPrice)}</span> a month
                  </p>
                  <a
                    href={`/${area.slug}/pricing`}
                    className="mt-3 inline-block text-xs font-semibold uppercase tracking-[0.14em] underline underline-offset-4"
                  >
                    {area.name} pricing
                  </a>
                </li>
              ))}
            </ul>

            <p className="mt-10 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Also serving
            </p>
            <p className="mt-2 max-w-4xl text-sm leading-relaxed text-muted-foreground">
              {ADDITIONAL_SERVICE_CITIES.join(" · ")}, all Texas.
            </p>
          </div>
        </section>

        <section className="border-t border-hairline py-14 sm:py-16">
          <div className="container-tight max-w-2xl">
            <h2 className="font-display text-2xl uppercase tracking-[0.04em]">
              Ready for clear water?
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              New customers get a free pool inspection and a flat monthly quote, no contracts.
              Call {PHONE_VANITY_WITH_DIGITS}, email {EMAIL} or book a time online.
            </p>
            <Link
              to="/schedule"
              className="mt-6 inline-block border border-foreground bg-foreground px-5 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-background"
            >
              Book a free inspection
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
      <StickyCallBar />
    </div>
  );
}
