import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { BookingDialog } from "@/components/BookingDialog";

const TITLE = "Book a Free Pool Inspection or 3D Quote | Savvy Swim";
const DESCRIPTION =
  "Book your free, no-obligation pool inspection or 3D quote with Savvy Swim. Pick a time and we'll confirm by phone or email within one business day.";
const URL = "https://savvyswim.com/book";

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
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
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
    q: "Do you work with insurance claims?",
    a: "Yes. If your pool or equipment was damaged and you're filing a claim, we document the damage with photos and provide a written, itemized estimate you can submit to your insurer. We can also speak with your adjuster on site during the inspection.",
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
