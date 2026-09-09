import { SERVICE_AREAS, type ServiceArea } from "@/lib/serviceAreas";

/**
 * Frisco has its own landing page rather than a SERVICE_AREAS entry, but it
 * still needs a pricing page, so it is folded in here only for pricing.
 */
const FRISCO: ServiceArea = {
  slug: "frisco",
  name: "Frisco",
  zips: "75033 / 75034 / 75035 / 75036",
  intro:
    "Weekly pool cleaning across Frisco, chemistry balanced, baskets emptied, equipment checked, photo report every visit.",
  neighborhoods: ["Starwood", "Stonebriar", "Newman Village", "Phillips Creek Ranch", "Richwoods", "The Trails"],
  startingPrice: "$129.99 / month",
};

export const PRICING_AREAS: ServiceArea[] = [...SERVICE_AREAS, FRISCO];

export const getPricingArea = (slug: string) =>
  PRICING_AREAS.find((a) => a.slug === slug);

/** "$129.99 / month" -> "$129.99" */
export const priceOnly = (startingPrice: string) =>
  startingPrice.replace(/\s*\/\s*month/i, "").trim();

/** "$129.99 / month" -> "129.99", for structured data. */
export const priceNumber = (startingPrice: string) =>
  priceOnly(startingPrice).replace(/[^0-9.]/g, "");

export const SWIM_CLUB_PRICE = "$19.99 / month";

export interface PricingTier {
  name: string;
  /** Null means we quote it at the walkthrough instead of guessing. */
  price: string | null;
  blurb: string;
  items: string[];
}

export const buildTiers = (area: ServiceArea): PricingTier[] => [
  {
    name: "Essential Weekly",
    price: `${priceOnly(area.startingPrice)} / month`,
    blurb: `The standard ${area.name} weekly route. Flat monthly rate, chemicals included, no per visit billing.`,
    items: [
      "One visit every week on your fixed route day",
      "Free and total chlorine, pH, alkalinity, cyanuric acid and calcium hardness tested on site",
      "Skim, brush walls and steps, vacuum the floor",
      "Skimmer and pump baskets emptied, cleaner bag cleared",
      "Chlorine, tabs, acid, salt and balancing chemicals included",
      "Filter pressure checked against clean baseline",
      "Photo report with readings sent before we leave",
    ],
  },
  {
    name: "Society",
    price: null,
    blurb:
      "Everything in Essential Weekly plus scheduled filter deep cleans and equipment care for busier pools.",
    items: [
      "Everything in Essential Weekly",
      "Quarterly filter deep clean",
      "Salt cell inspection and acid clean on schedule",
      "Priority scheduling for repairs",
      "Freeze protection check ahead of a hard freeze",
    ],
  },
  {
    name: "Concierge",
    price: null,
    blurb:
      "For estate pools, spas, water features and full automation, where presentation matters every day of the week.",
    items: [
      "Everything in Society",
      "Additional visits during peak season",
      "Waterline tile detail and scale management",
      "Automation, heater and lighting setup managed for you",
      "Named technician with a backup on the same route",
    ],
  },
];

export const PRICE_FACTORS = [
  "Pool size and gallons",
  "Attached spa or water features",
  "Salt system versus traditional chlorine",
  "Heavy tree cover and how much debris lands in the water",
  "Current condition, a neglected or green pool needs a reset first",
  "Extras such as a separate hot tub or a second pool",
];

export const buildPricingFaq = (area: ServiceArea) => [
  {
    q: `How much is weekly pool service in ${area.name}, TX?`,
    a: `${area.name} weekly service starts at ${priceOnly(area.startingPrice)} a month with chemicals included. Pool size, a spa, and current condition set the final number, and we lock it in flat after a free walkthrough.`,
  },
  {
    q: "Are chemicals included in the monthly price?",
    a: "Yes. Chlorine, tabs, acid, salt and balancing chemicals are all in the monthly rate. There is no separate chemical charge and no fuel surcharge.",
  },
  {
    q: "What does the Swim Club add-on cost?",
    a: `Swim Club is ${SWIM_CLUB_PRICE} on top of your service price. So a ${priceOnly(area.startingPrice)} pool with Swim Club comes to ${priceOnly(area.startingPrice).replace("$", "")} plus 19.99 a month.`,
  },
  {
    q: "Is there a contract?",
    a: "No contract and no cancellation fee. Service is month to month, and the price does not change week to week.",
  },
  {
    q: "What is not included?",
    a: "Repairs, replacement parts, filter media, green pool recovery and drain and refills are quoted separately. You approve any repair before we start it.",
  },
];
