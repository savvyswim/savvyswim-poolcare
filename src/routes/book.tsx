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
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: URL }],
  }),
  component: BookPage,
});

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
