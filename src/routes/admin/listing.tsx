import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { BUSINESS_HOURS } from "@/lib/business-hours";
import { PHONE_PLAIN, INSTAGRAM_URL } from "@/lib/contact-info";
import { PRICING_AREAS } from "@/lib/city-pricing";

export const Route = createFileRoute("/admin/listing")({
  component: ListingSheetPage,
  head: () => ({
    meta: [
      { title: "Business Listing Sheet · Savvy Swim Admin" },
      {
        name: "description",
        content:
          "Internal sheet with the exact Savvy Swim business name, phone, hours, service areas, categories and description to paste into Google and other directories.",
      },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Business Listing Sheet · Savvy Swim Admin" },
      {
        property: "og:description",
        content: "Everything to paste into Google Business Profile and other directories.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const NAME = "Savvy Swim Pool Care";
const SITE = "https://savvyswim.com";
const EMAIL = "hi@savvyswim.com";

const DESCRIPTION =
  "Savvy Swim Pool Care keeps Dallas–Fort Worth pools clear and swim ready. Weekly pool service, green pool recovery, equipment repair, filter cleans and free water testing, with photo reports after every visit. Free pool inspection for new customers, no contracts, licensed and insured.";

const CATEGORIES = [
  "Primary: Swimming pool cleaning service",
  "Secondary: Swimming pool repair service",
  "Secondary: Pool cleaning service",
  "Secondary: Swimming pool supply store (only if you sell chemicals)",
];

const SERVICES = [
  "Weekly pool service",
  "Green pool recovery",
  "Filter cleaning",
  "Equipment repair and installation",
  "Free water testing",
  "Savvy Swim Club membership",
];

const DIRECTORIES: { name: string; url: string; note: string }[] = [
  {
    name: "Google Business Profile",
    url: "https://business.google.com/create",
    note: "Choose 'I deliver goods and services to my customers', hide the street address, then set the service areas below. Verification is by postcard, phone or video and only the owner can complete it.",
  },
  {
    name: "Bing Places",
    url: "https://www.bingplaces.com",
    note: "Can import straight from Google once the Google listing is verified.",
  },
  {
    name: "Apple Business Connect",
    url: "https://businessconnect.apple.com",
    note: "Puts the business in Apple Maps and iPhone search.",
  },
  {
    name: "Yelp for Business",
    url: "https://biz.yelp.com",
    note: "Set it as a service area business so no home address shows.",
  },
  {
    name: "Nextdoor Business",
    url: "https://business.nextdoor.com",
    note: "Strong for neighborhood pool work, ask happy customers to recommend you.",
  },
];

function Copy({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-foreground/10 py-3">
      <div>
        <p className="text-[11px] uppercase tracking-[0.16em] text-foreground/50">{label}</p>
        <p className="mt-1 whitespace-pre-wrap text-sm">{value}</p>
      </div>
      <button
        className="shrink-0 border border-foreground/25 px-3 py-1 text-[11px] uppercase tracking-[0.14em]"
        onClick={() => {
          void navigator.clipboard.writeText(value).then(
            () => toast.success(`${label} copied`),
            () => toast.error("Could not copy"),
          );
        }}
      >
        Copy
      </button>
    </div>
  );
}

function ListingSheetPage() {
  const hours = BUSINESS_HOURS.map((h) => `${h.label}: ${h.display}`).join("\n");
  const areas = PRICING_AREAS.map((a) => a.name).join(", ");

  return (
    <main className="mx-auto max-w-4xl px-5 py-12">
      <header className="border-b border-foreground/15 pb-6">
        <p className="text-[11px] uppercase tracking-[0.2em] text-[#8E1F2C]">Savvy Swim · Admin</p>
        <h1 className="font-display text-4xl uppercase tracking-[0.04em]">Business listing sheet</h1>
        <p className="mt-2 text-sm text-foreground/60">
          Use exactly these details on every listing. Google compares them with the website, so any
          difference slows verification down and can hurt where you rank.
        </p>
      </header>

      <section className="mt-8">
        <Copy label="Business name" value={NAME} />
        <Copy label="Phone" value={PHONE_PLAIN} />
        <Copy label="Website" value={SITE} />
        <Copy label="Email" value={EMAIL} />
        <Copy label="Instagram" value={INSTAGRAM_URL} />
        <Copy label="Hours" value={hours} />
        <Copy label="Service areas" value={areas} />
        <Copy label="Categories" value={CATEGORIES.join("\n")} />
        <Copy label="Services list" value={SERVICES.join("\n")} />
        <Copy label="Description" value={DESCRIPTION} />
      </section>

      <section className="mt-12">
        <h2 className="font-display text-2xl uppercase tracking-[0.06em]">Where to list</h2>
        <ul className="mt-4 space-y-4">
          {DIRECTORIES.map((d) => (
            <li key={d.name} className="border border-foreground/15 p-5">
              <a
                href={d.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-[#8E1F2C]"
              >
                {d.name}
              </a>
              <p className="mt-1 text-sm text-foreground/65">{d.note}</p>
            </li>
          ))}
        </ul>
        <p className="mt-6 border border-foreground/15 bg-foreground/[0.03] p-5 text-sm text-foreground/65">
          Photos to upload: the logo, three or four recent pool photos from the work gallery, and one
          photo of a service truck or team member. Once Google verification is finished, send me the
          public profile link and I will connect it to the site and the review button.
        </p>
      </section>
    </main>
  );
}
