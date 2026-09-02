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
  /** Weekly route day(s) we run in this city. */
  routeDays: string;
}

export const SERVICE_LOCATIONS: ServiceLocation[] = [
  { name: "Plano", href: "/plano", lat: 33.0198, lng: -96.6989, routeDays: "Mon–Tue" },
  { name: "Frisco", href: "/frisco", lat: 33.1507, lng: -96.8236, routeDays: "Tue–Wed" },
  { name: "McKinney", href: "/mckinney", lat: 33.1972, lng: -96.6398, routeDays: "Wed" },
  { name: "Allen", href: "/allen", lat: 33.1032, lng: -96.6706, routeDays: "Wed" },
  { name: "Prosper", href: "/prosper", lat: 33.2362, lng: -96.8011, routeDays: "Thu" },
  { name: "Richardson", href: "/richardson", lat: 32.9483, lng: -96.7299, routeDays: "Thu" },
  { name: "Garland", href: "/garland", lat: 32.9126, lng: -96.6389, routeDays: "Thu" },
  { name: "Dallas", href: "/dallas", lat: 32.7767, lng: -96.797, routeDays: "Mon–Fri" },
  { name: "Highland Park", href: "/highland-park", lat: 32.8321, lng: -96.8014, routeDays: "Fri" },
  { name: "University Park", href: "/university-park", lat: 32.8507, lng: -96.797, routeDays: "Fri" },
  { name: "Irving", href: "/irving", lat: 32.814, lng: -96.9489, routeDays: "Fri" },
  { name: "Rockwall", href: "/rockwall", lat: 32.9312, lng: -96.4597, routeDays: "Fri" },
];

/** Office hours shown next to the map and mirrored in structured data. */
export const BUSINESS_HOURS: { days: string; hours: string }[] = [
  { days: "Monday – Friday", hours: "8:00 AM – 6:00 PM" },
  { days: "Saturday", hours: "9:00 AM – 2:00 PM" },
  { days: "Sunday", hours: "Closed — emergency line only" },
];
