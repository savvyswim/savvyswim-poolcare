import { PHONE_HREF, PHONE_VANITY_WITH_DIGITS } from "@/lib/contact-info";
import { REPLY_TO_ADDRESS } from "@/lib/email-config";

/**
 * Real service locations + hours used by the public service-area map and the
 * LocalBusiness structured data. Coordinates are city centres for the routes
 * we actually run — each pin links to that city's pool service page.
 */

export interface ServiceLocation {
  name: string;
  /** Public page for this location. */
  href: string;
  lat: number;
  lng: number;
}

export const SERVICE_LOCATIONS: ServiceLocation[] = [
  { name: "Plano", href: "/plano", lat: 33.0198, lng: -96.6989 },
  { name: "Frisco", href: "/frisco", lat: 33.1507, lng: -96.8236 },
  { name: "McKinney", href: "/mckinney", lat: 33.1972, lng: -96.6398 },
  { name: "Allen", href: "/allen", lat: 33.1032, lng: -96.6706 },
  { name: "Prosper", href: "/prosper", lat: 33.2362, lng: -96.8011 },
  { name: "Richardson", href: "/richardson", lat: 32.9483, lng: -96.7299 },
  { name: "Garland", href: "/garland", lat: 32.9126, lng: -96.6389 },
  { name: "Dallas", href: "/dallas", lat: 32.7767, lng: -96.797 },
  { name: "Highland Park", href: "/highland-park", lat: 32.8321, lng: -96.8014 },
  { name: "University Park", href: "/university-park", lat: 32.8507, lng: -96.797 },
  { name: "Irving", href: "/irving", lat: 32.814, lng: -96.9489 },
  { name: "Rockwall", href: "/rockwall", lat: 32.9312, lng: -96.4597 },
];

/**
 * Wider DFW cities we run into that do not have their own page yet. Shown as
 * plain text in the service-area list so the full coverage is visible.
 */
export const ADDITIONAL_SERVICE_CITIES: string[] = [
  "Addison",
  "Argyle",
  "Arlington",
  "Bedford",
  "Carrollton",
  "Cedar Hill",
  "Celina",
  "Colleyville",
  "Coppell",
  "DeSoto",
  "Duncanville",
  "Euless",
  "Fairview",
  "Farmers Branch",
  "Flower Mound",
  "Fort Worth",
  "Grand Prairie",
  "Grapevine",
  "Haltom City",
  "Heath",
  "Hurst",
  "Keller",
  "Lake Highlands",
  "Lantana",
  "Lewisville",
  "Little Elm",
  "Lucas",
  "Mansfield",
  "Melissa",
  "Mesquite",
  "Murphy",
  "North Richland Hills",
  "Parker",
  "Preston Hollow",
  "Princeton",
  "Rowlett",
  "Sachse",
  "Southlake",
  "Sunnyvale",
  "The Colony",
  "Trophy Club",
  "Wylie",
];


/** Office hours shown next to the map and mirrored in structured data. */
export const BUSINESS_HOURS: { days: string; hours: string }[] = [
  { days: "Monday – Friday", hours: "8:00 AM – 6:00 PM" },
  { days: "Saturday", hours: "9:00 AM – 2:00 PM" },
  { days: "Sunday", hours: "Closed, emergency line only" },
];

/**
 * Real contact details for every city we run. Savvy Swim is a service-area
 * business: one phone line, one inbox, no walk-in address.
 */
export const SERVICE_AREA_CONTACT = {
  phoneHref: PHONE_HREF,
  phoneDisplay: PHONE_VANITY_WITH_DIGITS,
  email: REPLY_TO_ADDRESS,
  emailHref: `mailto:${REPLY_TO_ADDRESS}`,
  note: "We come to your pool, mobile service only, no walk-in location.",
  hours: BUSINESS_HOURS,
} as const;
