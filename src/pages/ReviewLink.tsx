import { useEffect, useState } from "react";
import { useParams } from "@/lib/router-compat";
import { Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Payload = {
  customer_name: string;
  message: string | null;
  photos: string[] | null;
  google_url: string;
};

export default function ReviewLink() {
  const { token = "" } = useParams();
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Leave a review — Savvy Swim";
    (async () => {
      const { data: rows } = await supabase.rpc("ss_get_review_request", { _token: token });
      setData((rows as Payload[] | null)?.[0] ?? null);
      setLoading(false);
    })();
  }, [token]);

  function goReview() {
    void supabase.rpc("ss_mark_review_clicked", { _token: token });
    if (data) window.location.href = data.google_url;
  }

  if (loading) return null;

  if (!data) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-8 text-center">
        <p className="text-muted-foreground">This review link is no longer available.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-xl px-5 py-10">
        <p className="text-[0.7rem] uppercase tracking-[0.28em] text-muted-foreground">
          Savvy Swim
        </p>
        <h1 className="mt-2 text-3xl font-semibold leading-tight text-foreground">
          Thanks, {data.customer_name}.
        </h1>
        {data.message && (
          <p className="mt-3 text-[0.95rem] leading-relaxed text-muted-foreground">
            {data.message}
          </p>
        )}

        {!!data.photos?.length && (
          <div className="mt-6 grid grid-cols-2 gap-3">
            {data.photos.map((p, i) => (
              <img
                key={p}
                src={p}
                alt={`Pool service photo ${i + 1}`}
                loading={i > 1 ? "lazy" : "eager"}
                className="h-44 w-full rounded-xl object-cover"
              />
            ))}
          </div>
        )}

        <button
          onClick={goReview}
          className="mt-8 flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-4 text-[0.95rem] font-semibold text-primary-foreground"
        >
          <Star size={16} /> Leave a Google review
        </button>
        <p className="mt-3 text-center text-[0.75rem] text-muted-foreground">
          Takes about 20 seconds — it opens Google directly.
        </p>
        <p className="mt-4 text-center text-[0.8rem]">
          <a href="/leave-a-review" className="underline underline-offset-4">
            Or leave your review right here
          </a>
        </p>
      </div>
    </main>
  );
}
