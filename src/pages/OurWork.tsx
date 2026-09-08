import { CalendarCheck, ShieldCheck, Wrench } from "lucide-react";
import Seo from "@/components/Seo";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { StickyCallBar } from "@/components/CallButton";
import { goToLead } from "@/lib/site-analytics";

import { IMG_5512_PNG as photoLifeguardChair } from "@/assets/photos";
import { IMG_5507_2_JPG as photoNavyCabana } from "@/assets/photos";
import { IMG_5508_2_JPG as photoRivieraLoungers } from "@/assets/photos";
import { IMG_5518_PNG as photoSavvyRings } from "@/assets/photos";
import { IMG_5502_PNG as photoSavvyLetters } from "@/assets/photos";
import photoRescueTube from "@/assets/IMG_5503.jpg.asset.json";

const PHOTOS = [
  { src: photoNavyCabana.url, alt: "Navy and white striped cabana beside a clear serviced pool" },
  { src: photoRescueTube.url, alt: "Savvy Swim rescue tube floating in a sparkling clean pool" },
  { src: photoSavvyRings.url, alt: "Red and white Savvy pool rings floating in clear water" },
  { src: photoSavvyLetters.url, alt: "Inflatable SAVVY letters floating in a bright blue pool" },
  { src: photoLifeguardChair.url, alt: "Savvy Swim lifeguard chair beside a serviced pool" },
  { src: photoRivieraLoungers.url, alt: "Poolside loungers at a Savvy Swim serviced pool" },
];

const BENEFITS = [
  {
    icon: CalendarCheck,
    title: "Same tech, same day, every week",
    desc: "You get a dedicated technician on a fixed schedule. No rotating crews, no surprise skips.",
  },
  {
    icon: ShieldCheck,
    title: "Clear water guaranteed",
    desc: "If your water isn't swim-ready after a visit, we come back and fix it at no charge.",
  },
  {
    icon: Wrench,
    title: "Repairs handled in-house",
    desc: "Pumps, heaters, filters, salt cells and automation, diagnosed and repaired by the same team.",
  },
];

const OurWork = () => (
  <div className="min-h-screen overflow-x-hidden">
    <Seo
      title="Our Work, Pools We Service Across DFW | Savvy Swim"
      description="Photos from pools Savvy Swim services every week across Dallas–Fort Worth, plus what you get with a weekly plan."
      path="/our-work"
    />
    <SiteHeader />

    <main>
      <section className="container-tight py-16 sm:py-20">
        <div className="max-w-2xl">
          <div className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-amber-brand">
            Our work
          </div>
          <h1 className="text-[2rem] font-semibold leading-[1.12] tracking-tight sm:text-[2.6rem]">
            Pools we look after every week.
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
            One flat weekly rate. Certified techs, balanced water, working equipment, and a photo
            report in your inbox after every single visit.
          </p>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PHOTOS.map((p) => (
            <div key={p.src} className="overflow-hidden rounded-sm border border-hairline shadow-card">
              <img
                src={p.src}
                alt={p.alt}
                loading="lazy"
                decoding="async"
                width={720}
                height={540}
                sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                className="aspect-[4/3] w-full object-cover transition-transform duration-700 hover:scale-105"
              />
            </div>
          ))}
        </div>

        <div className="mt-14 grid gap-4 md:grid-cols-3">
          {BENEFITS.map((b) => (
            <div key={b.title} className="card-3d flex flex-col rounded-sm p-7">
              <b.icon className="mb-5 h-6 w-6 text-amber-brand" />
              <h2 className="mb-2 text-lg font-semibold">{b.title}</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">{b.desc}</p>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => goToLead("our_work")}
          data-savvy-cta="request_quote"
          className="btn-quote mt-12 inline-flex items-center rounded-md px-7 py-4 text-sm font-bold uppercase tracking-wide"
        >
          Book a free consultation
        </button>
      </section>
    </main>

    <SiteFooter />
    <StickyCallBar />
  </div>
);

export default OurWork;
