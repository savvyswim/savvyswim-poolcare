import { useEffect, useState } from "react";
import { serviceAreaMap } from "@/lib/area-map.functions";
import { SERVICE_AREA_CONTACT, SERVICE_LOCATIONS } from "@/lib/service-locations";

/**
 * Public map of the cities we actually run routes in. The image is rendered
 * server-side so it works on every domain, and each city links to its own
 * pool service page.
 */
export default function ServiceAreaMap() {
  const [image, setImage] = useState<string | null>(null);
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    let cancelled = false;
    serviceAreaMap()
      .then((res) => {
        if (!cancelled) setImage(res?.image ?? null);
      })
      .catch(() => {
        /* the city list below is the fallback */
      })
      .finally(() => {
        if (!cancelled) setSettled(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="border border-[#8E1F2C]/20 bg-[#F4EFE3]/60 p-6 sm:p-8">
      <p className="text-[11px] uppercase tracking-[0.2em] text-[#8E1F2C]">Where we service</p>
      <h2 className="mt-2 font-display text-3xl uppercase tracking-[0.04em]">
        Pools we look after
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-foreground/70">
        Weekly routes across North Dallas and the Collin County suburbs. Pick your city for
        pricing, route days and a free inspection.
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="border border-[#8E1F2C]/15 bg-white/70">
          {image ? (
            <img
              src={image}
              alt="Map of Savvy Swim pool service areas across the Dallas metroplex"
              className="w-full"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full min-h-[220px] items-center justify-center p-6 text-sm text-foreground/55">
              Loading the service-area map…
            </div>
          )}
        </div>

        <div>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            {SERVICE_LOCATIONS.map((l) => (
              <li key={l.name}>
                <a
                  href={l.href}
                  className="font-semibold text-[#8E1F2C] underline-offset-4 hover:underline"
                >
                  {l.name}
                </a>
                <span className="block text-[11px] text-foreground/55">{l.routeDays}</span>
              </li>
            ))}
          </ul>

          <div className="mt-6 border-t border-[#8E1F2C]/15 pt-4">
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
