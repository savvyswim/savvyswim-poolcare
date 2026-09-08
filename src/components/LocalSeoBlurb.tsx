import { Link } from "@/lib/router-compat";
import { BUSINESS_HOURS } from "@/lib/business-hours";
import { PHONE_HREF, PHONE_VANITY_WITH_DIGITS } from "@/lib/contact-info";
import { SERVICE_LOCATIONS } from "@/lib/service-locations";
import { trackContactClick } from "@/lib/contactTracking";

const EMAIL = "hi@savvyswim.com";

/**
 * Plain-language local search block. Names the metro, the cities we actually
 * run routes in, the published hours and how to reach us. Every fact reads
 * from the same constants as the LocalBusiness structured data and the Google
 * Business Profile, so nothing here can drift.
 */
export default function LocalSeoBlurb({ city }: { city?: string }) {
  const others = SERVICE_LOCATIONS.filter((l) => l.name !== city);
  const heading = city
    ? `Pool service in ${city}, Texas`
    : "Pool service across Dallas–Fort Worth";

  return (
    <section
      aria-labelledby="local-seo-heading"
      className="perf-section border-b border-hairline py-16 sm:py-20"
    >
      <div className="container-tight max-w-3xl">
        <h2
          id="local-seo-heading"
          className="font-display text-[1.9rem] uppercase leading-none tracking-tight sm:text-[2.4rem]"
        >
          {heading}
          <span className="text-accent">.</span>
        </h2>

        <p className="mt-6 leading-relaxed text-muted-foreground">
          Savvy Swim is a mobile pool service company. There is no walk-in shop, our
          techs come to your pool. {city ? `We run a weekly ${city} route and also serve ` : "We run weekly routes in "}
          {others.slice(0, 8).map((l, i) => (
            <span key={l.name}>
              {i > 0 ? ", " : ""}
              <Link to={l.href} className="underline underline-offset-4">
                {l.name}
              </Link>
            </span>
          ))}{" "}
          and the wider Dallas–Fort Worth metroplex. Weekly cleaning, chemistry balancing,
          filter and equipment repair, green-pool recovery and hard-water scale care are all
          handled by the same crew.
        </p>

        <p className="mt-4 leading-relaxed text-muted-foreground">
          Office hours are{" "}
          {BUSINESS_HOURS.filter((r) => r.opens)
            .map((r) => `${r.label} ${r.display}`)
            .join(", ")}
          . Sundays are closed, with the emergency line reserved for Swim Club members. Call{" "}
          <a
            href={PHONE_HREF}
            onClick={() => trackContactClick("call_click", "local_seo_blurb")}
            className="font-semibold underline underline-offset-4"
          >
            {PHONE_VANITY_WITH_DIGITS}
          </a>{" "}
          or email{" "}
          <a href={`mailto:${EMAIL}`} className="font-semibold underline underline-offset-4">
            {EMAIL}
          </a>{" "}
          for a free pool inspection and a flat monthly quote.
        </p>
      </div>
    </section>
  );
}
