import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { BUSINESS_HOURS } from "@/lib/business-hours";
import {
  GOOGLE_PROFILE_URL,
  PHONE_HREF,
  PHONE_VANITY_WITH_DIGITS,
} from "@/lib/contact-info";
import { SERVICE_LOCATIONS } from "@/lib/service-locations";
import { trackContactClick } from "@/lib/contactTracking";

const EMAIL = "hi@savvyswim.com";

/**
 * Public business details shown next to the service-area map. Everything here
 * reads from the same constants as the LocalBusiness structured data, so the
 * website and the Google Business Profile cannot drift apart.
 */
export default function BusinessInfoCard() {
  return (
    <section
      aria-labelledby="business-info-heading"
      className="border border-hairline bg-card p-6 sm:p-8"
    >
      <h3
        id="business-info-heading"
        className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground"
      >
        Business details
      </h3>

      <div className="mt-6 grid gap-8 sm:grid-cols-2">
        <div className="min-w-0 space-y-4">
          <p className="flex items-start gap-3 text-sm">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              <span className="block font-semibold">Mobile service, we come to you</span>
              <span className="text-muted-foreground">
                No walk-in shop. Weekly routes across{" "}
                {SERVICE_LOCATIONS.slice(0, 6)
                  .map((l) => l.name)
                  .join(", ")}{" "}
                and the wider Dallas–Fort Worth metroplex.
              </span>
            </span>
          </p>

          <p className="flex items-start gap-3 text-sm">
            <Phone className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <a
              href={PHONE_HREF}
              onClick={() => trackContactClick("call_click", "business_info_card")}
              className="font-semibold underline-offset-4 hover:underline"
            >
              {PHONE_VANITY_WITH_DIGITS}
            </a>
          </p>

          <p className="flex items-start gap-3 text-sm">
            <Mail className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <a
              href={`mailto:${EMAIL}`}
              className="font-semibold underline-offset-4 hover:underline"
            >
              {EMAIL}
            </a>
          </p>

          {GOOGLE_PROFILE_URL ? (
            <p className="text-sm">
              <a
                href={GOOGLE_PROFILE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold underline underline-offset-4"
              >
                View us on Google
              </a>
            </p>
          ) : null}
        </div>

        <div className="min-w-0">
          <p className="flex items-center gap-3 text-sm font-semibold">
            <Clock className="h-4 w-4 shrink-0" aria-hidden="true" /> Service hours
          </p>
          <dl className="mt-3 space-y-2 text-sm">
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
        </div>
      </div>
    </section>
  );
}
