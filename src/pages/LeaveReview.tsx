import { useState } from "react";
import { Star, Send, CheckCircle2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";

import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { GOOGLE_REVIEW_URL } from "@/lib/contact-info";
import { submitReview } from "@/lib/reviews.functions";

/** Public page where a customer rates Savvy Swim in their own words. */
export default function LeaveReview() {
  const send = useServerFn(submitReview);

  const [rating, setRating] = useState(5);
  const [hover, setHover] = useState(0);
  const [body, setBody] = useState("");
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (body.trim().length < 10) {
      setError("Please write at least a sentence about your service.");
      return;
    }
    if (name.trim().length < 2) {
      setError("Please add your first name.");
      return;
    }
    setBusy(true);
    try {
      const res = await send({
        data: {
          rating,
          body: body.trim(),
          author_name: name.trim(),
          author_city: city.trim() || null,
          contact_email: email.trim() || null,
          page_path: typeof window === "undefined" ? null : window.location.pathname,
        },
      });
      if (res.ok) setDone(true);
      else setError(res.error);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen overflow-x-hidden">
      <SiteHeader />

      <main className="container-tight py-16 sm:py-20">
        <div className="mx-auto w-full max-w-xl">
          <div className="font-tech text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
            LEAVE A REVIEW
          </div>

          {done ? (
            <div className="mt-4">
              <h1 className="text-[2rem] font-semibold leading-tight tracking-tight sm:text-[2.5rem]">
                Thank you.
              </h1>
              <p className="mt-3 flex items-start gap-2 text-[1.05rem] leading-relaxed text-muted-foreground">
                <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-amber-brand" />
                Your review is with our team. If it helps other pool owners, we will add it to
                the site.
              </p>
              <a
                href={GOOGLE_REVIEW_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-quote mt-8 inline-flex min-h-12 items-center justify-center gap-2 rounded-md px-7 py-3.5 text-sm font-bold uppercase tracking-wide"
              >
                <Star className="h-4 w-4" /> Also review us on Google
              </a>
              <p className="mt-3 text-[0.8rem] text-muted-foreground">
                Takes about 20 seconds. It opens Google directly.
              </p>
            </div>
          ) : (
            <>
              <h1 className="mt-3 text-[2rem] font-semibold leading-tight tracking-tight sm:text-[2.5rem]">
                How did we do?
              </h1>
              <p className="mt-3 text-[1.05rem] leading-relaxed text-muted-foreground">
                A few words from you help the next pool owner in your neighborhood pick with
                confidence.
              </p>

              <form onSubmit={onSubmit} className="card-3d mt-8 rounded-sm p-6 sm:p-7">
                <fieldset>
                  <legend className="text-sm font-semibold">Your rating</legend>
                  <div className="mt-3 flex items-center gap-1.5">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        aria-label={`${n} star${n > 1 ? "s" : ""}`}
                        aria-pressed={rating === n}
                        onClick={() => setRating(n)}
                        onMouseEnter={() => setHover(n)}
                        onMouseLeave={() => setHover(0)}
                        className="p-1 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                      >
                        <Star
                          className={`h-8 w-8 ${
                            n <= (hover || rating)
                              ? "fill-amber-brand text-amber-brand"
                              : "text-muted-foreground/40"
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </fieldset>

                <label className="mt-6 block text-sm font-semibold" htmlFor="review-body">
                  Your review
                </label>
                <textarea
                  id="review-body"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  maxLength={1200}
                  rows={5}
                  required
                  placeholder="What did our tech do, and how does the water look now?"
                  className="mt-2 w-full rounded-sm border border-hairline bg-transparent px-3 py-2 text-sm leading-relaxed"
                />

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-semibold" htmlFor="review-name">
                      First name
                    </label>
                    <input
                      id="review-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      maxLength={80}
                      required
                      className="mt-2 w-full rounded-sm border border-hairline bg-transparent px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold" htmlFor="review-city">
                      City
                    </label>
                    <input
                      id="review-city"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      maxLength={80}
                      placeholder="Frisco, TX"
                      className="mt-2 w-full rounded-sm border border-hairline bg-transparent px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                <label className="mt-4 block text-sm font-semibold" htmlFor="review-email">
                  Email <span className="font-normal text-muted-foreground">(optional, never shown)</span>
                </label>
                <input
                  id="review-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  maxLength={200}
                  className="mt-2 w-full rounded-sm border border-hairline bg-transparent px-3 py-2 text-sm"
                />

                {error && (
                  <p role="alert" className="mt-4 text-sm font-semibold text-accent">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={busy}
                  className="btn-quote mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-md px-7 py-3.5 text-sm font-bold uppercase tracking-wide disabled:opacity-60"
                >
                  <Send className="h-4 w-4" /> {busy ? "Sending…" : "Send review"}
                </button>
                <p className="mt-3 text-[0.8rem] text-muted-foreground">
                  We read every review before it appears on the site.
                </p>
              </form>
            </>
          )}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
