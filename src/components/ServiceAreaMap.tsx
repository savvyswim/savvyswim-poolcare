import ServiceAreaSvgMap from "@/components/ServiceAreaSvgMap";
import {
  ADDITIONAL_SERVICE_CITIES,
  SERVICE_AREA_CONTACT,
  SERVICE_LOCATIONS,
} from "@/lib/service-locations";

/**
 * Public list of the cities we run routes in across DFW.
 */
export default function ServiceAreaMap() {
  return (
    <section className="border border-[#8E1F2C]/20 bg-[#F4EFE3]/60 p-6 sm:p-8">
      <p className="text-[11px] uppercase tracking-[0.2em] text-[#8E1F2C]">Where we service</p>
      <h2 className="mt-2 font-display text-3xl uppercase tracking-[0.04em]">
        Pools we look after
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-foreground/70">
        Weekly routes across the Dallas–Fort Worth metroplex. Pick your city for pricing and a
        free inspection.
      </p>



      <div className="mt-6 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
            {SERVICE_LOCATIONS.map((l) => (
              <li key={l.name}>
                <a
                  href={l.href}
                  className="font-semibold text-[#8E1F2C] underline-offset-4 hover:underline"
                >
                  {l.name}
                </a>
              </li>
            ))}
          </ul>

          <p className="mt-5 text-[11px] uppercase tracking-[0.18em] text-foreground/50">
            Also serving
          </p>
          <p className="mt-2 text-sm leading-relaxed text-foreground/70">
            {ADDITIONAL_SERVICE_CITIES.join(" · ")}
          </p>
        </div>

        <div>
          <div className="border-t border-[#8E1F2C]/15 pt-4 lg:border-t-0 lg:pt-0">

            <p className="text-[11px] uppercase tracking-[0.18em] text-foreground/50">Hours</p>
            <ul className="mt-2 space-y-1 text-sm text-foreground/75">
              {SERVICE_AREA_CONTACT.hours.map((h) => (
                <li key={h.days} className="flex justify-between gap-4">
                  <span>{h.days}</span>
                  <span className="text-foreground/60">{h.hours}</span>
                </li>
              ))}
            </ul>

            <div className="mt-4 space-y-1">
              <a
                href={SERVICE_AREA_CONTACT.phoneHref}
                className="block text-sm font-semibold text-[#8E1F2C] underline-offset-4 hover:underline"
              >
                {SERVICE_AREA_CONTACT.phoneDisplay}
              </a>
              <a
                href={SERVICE_AREA_CONTACT.emailHref}
                className="block text-sm font-semibold text-[#8E1F2C] underline-offset-4 hover:underline"
              >
                {SERVICE_AREA_CONTACT.email}
              </a>
            </div>

            <p className="mt-3 text-[11px] leading-relaxed text-foreground/55">
              {SERVICE_AREA_CONTACT.note}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
