export interface ServiceArea {
  slug: string;
  name: string;
  zips: string;
  intro: string;
  neighborhoods: string[];
  startingPrice: string;
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
      "Plano pools run on a fixed weekly route day with the same technician. We handle chemistry, cleaning, filters, and equipment so you never think about it.",
    neighborhoods: [
      "Willow Bend",
      "Deerfield",
      "Kings Ridge",
      "Legacy West",
      "Shoal Creek",
      "Hunters Glen",
    ],
    startingPrice: "$129.99 / month",
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
