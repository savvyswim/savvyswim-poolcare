import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { BookingDialog } from "@/components/BookingDialog";

const TITLE = "Book a Free Pool Inspection or 3D Quote | Savvy Swim";
const DESCRIPTION =
  "Book your free, no-obligation pool inspection or 3D quote with Savvy Swim. Pick a time and we'll confirm by phone or email within one business day.";
const URL = "https://savvyswim.com/book";
const OG_IMAGE = "https://savvyswim.com/og-book.jpg";

export const Route = createFileRoute("/book")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: URL },
      { property: "og:site_name", content: "Savvy Swim" },
      { property: "og:image", content: OG_IMAGE },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      {
        property: "og:image:alt",
        content: "Book a free pool inspection — Savvy Swim, Dallas–Fort Worth",
      },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
      { name: "twitter:image", content: OG_IMAGE },
      {
        name: "twitter:image:alt",
        content: "Book a free pool inspection — Savvy Swim, Dallas–Fort Worth",
      },
    ],
    links: [{ rel: "canonical", href: URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: TITLE,
          description: DESCRIPTION,
          url: URL,
          potentialAction: {
            "@type": "ReserveAction",
            target: URL,
            name: "Book a free pool inspection or 3D quote",
          },
          provider: {
            "@type": "LocalBusiness",
            name: "Savvy Swim",
            telephone: "+1-469-744-0379",
            url: "https://savvyswim.com",
            areaServed: "Dallas–Fort Worth, TX",
          },
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: FAQS.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }),
      },
    ],
  }),
  component: BookPage,
});

const FAQS: { q: string; a: string }[] = [
  {
    q: "Do you handle equipment repairs too?",
    a: "Yes. If the inspection turns up a failing pump, filter, heater, or automation panel, we document it with photos and give you a written, itemized repair estimate on the spot. No pressure and no obligation to book the work.",
  },
  {
    q: "What happens during a mobile inspection?",
    a: "A technician comes to your property, tests the water, checks the pump, filter, heater, and automation, looks over the surface and tile line, and walks you through what we find. It usually takes 30–45 minutes and there's no charge or obligation.",
  },
  {
    q: "How fast do you respond and get the work done?",
    a: "We confirm your booking by phone or email within one business day. Inspections are typically scheduled within a few days, and your written estimate follows within one business day of the visit. Repair timing depends on parts availability — we'll give you a date in the estimate.",
  },
];



function BookPage() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(true);

  return (
    <main className="min-h-screen bg-background px-6 py-20">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-primary">
          Free · No obligation
        </p>
        <h1 className="mt-3 text-4xl font-bold uppercase leading-[0.95] text-primary md:text-5xl">
          Book your inspection or 3D quote
        </h1>
        <p className="mt-4 text-base text-muted-foreground">
          Pick a time — we'll confirm by phone or email within one business day.
        </p>
        {!open && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="mt-8 bg-primary px-6 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-primary-foreground"
          >
            Open booking form
          </button>
        )}
      </div>

      <section className="mx-auto mt-16 max-w-2xl border-t border-primary/15 pt-10">
        <h2 className="text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-primary">
          Before you book
        </h2>
        <dl className="mt-6 divide-y divide-primary/10">
          {FAQS.map((f) => (
            <div key={f.q} className="py-5">
              <dt className="text-base font-semibold leading-snug text-primary">{f.q}</dt>
              <dd className="mt-2 text-[0.95rem] leading-relaxed text-muted-foreground">{f.a}</dd>
            </div>
          ))}
        </dl>
      </section>



      <BookingDialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) void navigate({ to: "/" });
        }}
      />
    </main>
  );
}
