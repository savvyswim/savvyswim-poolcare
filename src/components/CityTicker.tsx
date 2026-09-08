import { Link } from "@/lib/router-compat";
import { SERVICE_LOCATIONS } from "@/lib/service-locations";

/**
 * Slow scrolling strip of the DFW cities we run weekly routes in.
 * Each name links to that city's pool service page; it pauses on hover and
 * holds still for anyone who asked for reduced motion.
 */
export default function CityTicker() {
  const row = (
    <span className="flex shrink-0 items-center">
      {SERVICE_LOCATIONS.map((c) => (
        <span key={c.name} className="flex items-center">
          <Link
            to={c.href}
            className="px-4 font-display text-[0.95rem] uppercase tracking-tight text-accent/70 transition hover:text-accent sm:text-[1.1rem]"
          >
            {c.name}
          </Link>
          <span aria-hidden className="text-accent/25">
            /
          </span>
        </span>
      ))}
    </span>
  );

  return (
    <div className="marquee-pause border-b border-hairline bg-background">
      <div className="marquee-fade overflow-hidden py-2.5">
        <div className="flex w-max animate-marquee-slow">
          {row}
          <span aria-hidden className="flex shrink-0 items-center">
            {row}
          </span>
        </div>
      </div>
    </div>
  );
}
