export interface CityFaqItem {
  q: string;
  a: string;
}

export interface CityLocalDetail {
  /** Short lede shown above the local water section. */
  waterHeadline: string;
  waterNotes: { title: string; body: string }[];
  /** Weekly route coverage, grouped by area of the city. */
  routeDays: { area: string; zips: string; window: string }[];
  routeNote: string;
  /** Exactly what a weekly visit includes in this city. */
  inclusions: { group: string; items: string[] }[];
  /** City-specific FAQ appended to the shared set. */
  extraFaq?: CityFaqItem[];
}

export interface ServiceArea {
  slug: string;
  name: string;
  zips: string;
  intro: string;
  neighborhoods: string[];
  startingPrice: string;
  local?: CityLocalDetail;
}

export const SERVICE_AREAS: ServiceArea[] = [
  {
    slug: "dallas",
    name: "Dallas",
    zips: "75201 / 75204 / 75214 / 75225 / 75230",
    intro:
      "Weekly pool cleaning across Dallas — from Lakewood and Lower Greenville out to Preston Hollow. Chemistry balanced, baskets emptied, equipment checked, photo report every visit.",
    neighborhoods: [
      "Lakewood",
      "Preston Hollow",
      "Lower Greenville",
      "Bishop Arts",
      "White Rock",
      "Devonshire",
    ],
    startingPrice: "$129.99 / month",
  },
  {
    slug: "plano",
    name: "Plano",
    zips: "75023 / 75024 / 75025 / 75074 / 75093",
    intro:
      "Plano pools run on a fixed weekly route day with the same technician. We handle chemistry, cleaning, filters, and equipment so you never think about it — from the older shaded pools off Custer to the new builds around Legacy West.",
    neighborhoods: [
      "Willow Bend",
      "Deerfield",
      "Kings Ridge",
      "Legacy West",
      "Shoal Creek",
      "Hunters Glen",
    ],
    startingPrice: "$129.99 / month",
    local: {
      waterHeadline:
        "Plano fills from North Texas Municipal Water District surface water — that changes how a pool behaves here.",
      waterNotes: [
        {
          title: "Chloramine tap water",
          body:
            "NTMWD treats with chloramine, so every top-off adds combined chlorine rather than free chlorine. On a Plano pool that shows up as a faint chlorine smell and burning eyes while the test strip still reads 'fine'. We test free vs. total chlorine, not just total, and shock on combined-chlorine readings instead of on a calendar.",
        },
        {
          title: "The spring free-chlorine switch",
          body:
            "NTMWD runs a temporary free-chlorine conversion each spring. Auto-fill water tastes and behaves differently for those weeks, and pools that sat all winter swing fast. We tighten testing during the switch so Plano pools don't green up right before the first warm weekend.",
        },
        {
          title: "Evaporation + calcium creep",
          body:
            "A Plano pool can lose a quarter inch a day in July. Water leaves, minerals stay — calcium hardness and salinity climb, and you get that white crust on the waterline tile. We log calcium hardness every visit and treat scale before it etches tile or plaster.",
        },
        {
          title: "Post-cell salt scale",
          body:
            "Salt systems are everywhere in west Plano. High calcium plus a salt cell means scale on the plates and a cell that quietly under-produces. We inspect and acid-clean cells on schedule so you're not buying a new one every other season.",
        },
      ],
      routeDays: [
        { area: "West Plano", zips: "75024 / 75093", window: "Monday – Tuesday" },
        { area: "North & Central Plano", zips: "75023 / 75025", window: "Tuesday – Wednesday" },
        { area: "East Plano", zips: "75074 / 75075", window: "Wednesday – Thursday" },
      ],
      routeNote:
        "Your exact day is locked in at the walkthrough and does not float week to week. Friday is held for repairs, green-pool recovery, and same-day return visits across all of Plano.",
      inclusions: [
        {
          group: "Every weekly visit",
          items: [
            "Free + total chlorine, pH, alkalinity, cyanuric acid and calcium hardness tested on site",
            "Skim surface, brush walls, steps and tanning ledge, vacuum floor",
            "Empty skimmer and pump baskets, clear the cleaner bag",
            "Chemicals, tabs and salt included in the monthly rate",
            "Photo report with readings texted or emailed before we leave",
          ],
        },
        {
          group: "Equipment, every visit",
          items: [
            "Filter pressure check against clean baseline",
            "Pump, heater and automation quick inspection",
            "Salt cell output and salinity check on salt pools",
            "Waterline tile wipe and scale watch",
          ],
        },
        {
          group: "Included when needed",
          items: [
            "Filter deep clean on the Society and Concierge plans",
            "One complimentary return visit if the water isn't right",
            "Freeze-protection check when a hard freeze is forecast",
          ],
        },
      ],
      extraFaq: [
        {
          q: "Why does my Plano pool smell like chlorine but test fine?",
          a: "Because Plano's tap water is chloramine-treated, top-off water pushes combined chlorine up. Total chlorine looks normal while free chlorine is low — that's the smell. We test both every visit and correct it instead of adding more tabs.",
        },
        {
          q: "Do you handle salt pools and automation in west Plano?",
          a: "Yes. Pentair, Jandy and Hayward salt systems and controllers are standard on our Plano route — cell cleaning, salinity correction, variable-speed pump scheduling and app setup are all part of service.",
        },
        {
          q: "Do you service both east and west Plano?",
          a: "We run the whole city — 75023, 75024, 75025, 75074, 75075 and 75093 — on fixed weekly days. Your zip decides which day you land on.",
        },
      ],
    },
  },
  {
    slug: "mckinney",
    name: "McKinney",
    zips: "75069 / 75070 / 75071 / 75072",
    intro:
      "Weekly pool service for McKinney homeowners — hard-water scale control, salt cell care, and clear water backed by our same-day return guarantee.",
    neighborhoods: [
      "Stonebridge Ranch",
      "Adriatica",
      "Craig Ranch",
      "Trinity Falls",
      "Historic Downtown",
      "Eldorado",
    ],
    startingPrice: "$129.99 / month",
  },
  {
    slug: "allen",
    name: "Allen",
    zips: "75002 / 75013",
    intro:
      "Allen weekly pool cleaning with chemicals included, on-my-way texts, and a full photo report before we leave your driveway.",
    neighborhoods: [
      "Twin Creeks",
      "Watters Crossing",
      "Bethany Lakes",
      "Star Creek",
      "Montgomery Farm",
      "Cottonwood Bend",
    ],
    startingPrice: "$129.99 / month",
  },
  {
    slug: "richardson",
    name: "Richardson",
    zips: "75080 / 75081 / 75082",
    intro:
      "Richardson pool care built around older equipment and mature tree cover — heavier skimming, filter attention, and steady chemistry all season.",
    neighborhoods: [
      "Canyon Creek",
      "Prairie Creek",
      "Heights Park",
      "Cottonwood Heights",
      "Breckinridge",
      "Duck Creek",
    ],
    startingPrice: "$129.99 / month",
  },
  {
    slug: "highland-park",
    name: "Highland Park",
    zips: "75205 / 75219",
    intro:
      "Discreet, on-schedule pool service for Highland Park estates — tile and waterline care, automation checks, and immaculate presentation every week.",
    neighborhoods: [
      "Beverly Drive",
      "Lakeside Drive",
      "Armstrong Parkway",
      "Preston Road",
      "Euclid",
      "Drexel",
    ],
    startingPrice: "$179.99 / month",
  },
  {
    slug: "university-park",
    name: "University Park",
    zips: "75205 / 75225",
    intro:
      "University Park weekly service with quiet, uniformed technicians, full chemistry logs, and quarterly filter deep cleans available.",
    neighborhoods: [
      "Volk Estates",
      "Caruth Hills",
      "Greenway Parks",
      "Snider Plaza",
      "Bluffview",
      "Devonshire",
    ],
    startingPrice: "$179.99 / month",
  },
  {
    slug: "garland",
    name: "Garland",
    zips: "75040 / 75041 / 75042 / 75043 / 75044",
    intro:
      "Straightforward weekly pool cleaning in Garland — honest flat pricing, chemicals included, and repairs handled by the same crew that services you.",
    neighborhoods: [
      "Firewheel",
      "Duck Creek",
      "Club Hill",
      "Camelot",
      "Oakridge",
      "Rowlett Creek",
    ],
    startingPrice: "$119.99 / month",
  },
  {
    slug: "irving",
    name: "Irving",
    zips: "75038 / 75039 / 75060 / 75062 / 75063",
    intro:
      "Irving and Las Colinas pool service — weekly cleaning, salt system care, and automation setup so heater, lights, and spa live on your phone.",
    neighborhoods: [
      "Las Colinas",
      "Valley Ranch",
      "Hackberry Creek",
      "University Hills",
      "Song",
      "Cottonwood Valley",
    ],
    startingPrice: "$129.99 / month",
  },
  {
    slug: "rockwall",
    name: "Rockwall",
    zips: "75032 / 75087",
    intro:
      "Lakeside pools take more debris. Rockwall weekly service includes heavier skimming, filter monitoring, and equipment checks every visit.",
    neighborhoods: [
      "Chandlers Landing",
      "The Shores",
      "Stone Creek",
      "Breezy Hill",
      "Lakeside Village",
      "Caruth Lakes",
    ],
    startingPrice: "$129.99 / month",
  },
  {
    slug: "prosper",
    name: "Prosper",
    zips: "75078",
    intro:
      "Large-lot Prosper pools with spas, water features, and automation — one flat monthly rate, one assigned technician, zero surprises.",
    neighborhoods: [
      "Windsong Ranch",
      "Star Trail",
      "Whitley Place",
      "Lakes of La Cima",
      "Gentle Creek",
      "Whispering Farms",
    ],
    startingPrice: "$149.99 / month",
  },
];

export const getServiceArea = (slug: string) =>
  SERVICE_AREAS.find((a) => a.slug === slug);
