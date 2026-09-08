import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Check, Star } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type QuoteItem = {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  quantity: number;
  unit_price: number;
  is_optional: boolean;
  selected: boolean;
  recurring: string | null;
};

type QuoteView = {
  title: string;
  intro: string | null;
  hero_image_url: string | null;
  gallery: string[];
  reviews: { name: string; text: string; rating: number }[];
  status: string;
  recipient_name: string | null;
  valid_until: string | null;
  tax_pct: number;
  accepted_at: string | null;
  accepted_by: string | null;
  items: QuoteItem[];
};

const money = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(n || 0));

export const Route = createFileRoute("/quote/$token")({
  component: QuotePage,
  head: () => ({
    meta: [
      { title: "Your Savvy Swim proposal" },
      {
        name: "description",
        content:
          "Review your Savvy Swim pool care proposal. Photos, pricing, optional add-ons and approval in one place.",
      },
      { property: "og:title", content: "Your Savvy Swim proposal" },
      {
        property: "og:description",
        content: "Photos, pricing and optional add-ons for your pool, approve online in seconds.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function QuotePage() {
  const { token } = Route.useParams();
  const navigate = useNavigate();
  const [quote, setQuote] = useState<QuoteView | null>(null);
  const [loading, setLoading] = useState(true);
  const [picked, setPicked] = useState<Record<string, boolean>>({});
  const [signer, setSigner] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.rpc("ss_get_quote", { _token: token });
    const view = (data ?? null) as unknown as QuoteView | null;
    setQuote(view);
    if (view) {
      setPicked(
        Object.fromEntries(view.items.filter((i) => i.is_optional).map((i) => [i.id, i.selected])),
      );
      setSigner(view.accepted_by ?? "");
      void supabase.rpc("ss_mark_quote_viewed", { _token: token });
    }
    setLoading(false);
  }, [token]);

  useEffect(() => { void load(); }, [load]);

  const totals = useMemo(() => {
    const items = quote?.items ?? [];
    const base = items.filter((i) => !i.is_optional).reduce((s, i) => s + i.quantity * i.unit_price, 0);
    const extras = items
      .filter((i) => i.is_optional && picked[i.id])
      .reduce((s, i) => s + i.quantity * i.unit_price, 0);
    const sub = base + extras;
    const tax = sub * (Number(quote?.tax_pct ?? 0) / 100);
    return { base, extras, sub, tax, total: sub + tax };
  }, [quote, picked]);

  async function accept() {
    if (!signer.trim()) { toast.error("Type your name to approve"); return; }
    setSaving(true);
    const selected = Object.entries(picked).filter(([, v]) => v).map(([k]) => k);
    const { data, error } = await supabase.rpc("ss_accept_quote", {
      _token: token,
      _signer_name: signer.trim(),
      _selected_ids: selected,
    });
    setSaving(false);
    const res = data as { ok?: boolean; error?: string; contract_token?: string } | null;
    if (error || !res?.ok) { toast.error(error?.message ?? res?.error ?? "Could not approve"); return; }
    if (res.contract_token) {
      toast.success("Approved. Your service agreement is ready to sign.");
      void navigate({ to: "/sign/$token", params: { token: res.contract_token } });
      return;
    }
    toast.success("Approved. We'll be in touch shortly.");
    void load();
  }

  if (loading) return <main className="p-10 text-center">Loading your proposal…</main>;
  if (!quote) return <main className="p-10 text-center">This proposal link is no longer valid.</main>;

  const accepted = Boolean(quote.accepted_at);

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Savvy Swim</p>
      <h1 className="mt-2 text-3xl font-bold">{quote.title}</h1>
      {quote.recipient_name && (
        <p className="mt-1 text-sm text-muted-foreground">Prepared for {quote.recipient_name}</p>
      )}

      {quote.hero_image_url && (
        <img src={quote.hero_image_url} alt={quote.title} loading="lazy"
          className="mt-5 aspect-[16/9] w-full object-cover" />
      )}

      {quote.intro && <p className="mt-5 whitespace-pre-line text-sm leading-relaxed">{quote.intro}</p>}

      {quote.gallery?.length > 0 && (
        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {quote.gallery.map((src) => (
            <img key={src} src={src} alt="Recent Savvy Swim pool work" loading="lazy"
              className="aspect-square w-full object-cover" />
          ))}
        </div>
      )}

      <section className="mt-8">
        <h2 className="text-sm uppercase tracking-[0.2em] text-muted-foreground">What's included</h2>
        <ul className="mt-3 divide-y border">
          {quote.items.filter((i) => !i.is_optional).map((i) => (
            <li key={i.id} className="flex gap-3 p-3">
              {i.image_url && <img src={i.image_url} alt={i.name} loading="lazy" className="h-16 w-16 object-cover" />}
              <div className="flex-1">
                <div className="font-medium">{i.name}</div>
                {i.description && <p className="text-sm text-muted-foreground">{i.description}</p>}
              </div>
              <div className="text-right text-sm">
                {i.quantity > 1 && <div className="text-muted-foreground">×{i.quantity}</div>}
                {money(i.quantity * i.unit_price)}
              </div>
            </li>
          ))}
        </ul>
      </section>

      {quote.items.some((i) => i.is_optional) && (
        <section className="mt-8">
          <h2 className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Add these if you'd like</h2>
          <ul className="mt-3 space-y-2">
            {quote.items.filter((i) => i.is_optional).map((i) => (
              <li key={i.id}>
                <label className={`flex cursor-pointer gap-3 border p-3 ${picked[i.id] ? "border-primary" : ""}`}>
                  <input type="checkbox" className="mt-1" disabled={accepted} checked={Boolean(picked[i.id])}
                    onChange={(e) => setPicked((p) => ({ ...p, [i.id]: e.target.checked }))} />
                  {i.image_url && <img src={i.image_url} alt={i.name} loading="lazy" className="h-16 w-16 object-cover" />}
                  <div className="flex-1">
                    <div className="font-medium">{i.name}</div>
                    {i.description && <p className="text-sm text-muted-foreground">{i.description}</p>}
                  </div>
                  <div className="text-right text-sm">
                    {money(i.quantity * i.unit_price)}
                    {i.recurring && <div className="text-muted-foreground">{i.recurring}</div>}
                  </div>
                </label>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-8 border p-4 text-sm">
        <div className="flex justify-between"><span>Services</span><span>{money(totals.base)}</span></div>
        <div className="flex justify-between"><span>Add-ons</span><span>{money(totals.extras)}</span></div>
        {quote.tax_pct > 0 && (
          <div className="flex justify-between"><span>Tax</span><span>{money(totals.tax)}</span></div>
        )}
        <div className="mt-2 flex justify-between border-t pt-2 text-lg font-bold">
          <span>Total</span><span>{money(totals.total)}</span>
        </div>
        {quote.valid_until && (
          <p className="mt-2 text-xs text-muted-foreground">
            Good through {new Date(quote.valid_until).toLocaleDateString()}
          </p>
        )}
      </section>

      {quote.reviews?.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm uppercase tracking-[0.2em] text-muted-foreground">What neighbors say</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {quote.reviews.map((r) => (
              <blockquote key={r.name + r.text} className="border p-3 text-sm">
                <div className="flex gap-0.5">
                  {Array.from({ length: Math.max(1, Math.min(5, r.rating)) }).map((_, idx) => (
                    <Star key={idx} size={13} className="fill-current" />
                  ))}
                </div>
                <p className="mt-2">{r.text}</p>
                <footer className="mt-1 text-xs text-muted-foreground">{r.name}</footer>
              </blockquote>
            ))}
          </div>
        </section>
      )}

      <section className="mt-8 border p-4">
        {accepted ? (
          <p className="flex items-center gap-2 font-medium">
            <Check size={16} /> Approved by {quote.accepted_by} on{" "}
            {new Date(quote.accepted_at!).toLocaleDateString()}
          </p>
        ) : (
          <>
            <h2 className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Approve this proposal</h2>
            <input className="mt-3 w-full border p-2 text-sm" placeholder="Type your full name"
              value={signer} maxLength={120} onChange={(e) => setSigner(e.target.value)} />
            <button className="mt-3 w-full bg-primary p-3 font-semibold text-primary-foreground disabled:opacity-60"
              disabled={saving} onClick={() => void accept()}>
              {saving ? "Approving…" : `Approve ${money(totals.total)}`}
            </button>
          </>
        )}
      </section>
    </main>
  );
}
