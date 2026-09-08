import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Star } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import {
  deleteReview,
  listAllReviews,
  saveReview,
  type AdminReview,
  type ReviewStatus,
} from "@/lib/reviews.functions";

export const Route = createFileRoute("/admin/reviews")({
  component: ReviewsAdminPage,
  head: () => ({
    meta: [
      { title: "Reviews Desk · Savvy Swim Admin" },
      {
        name: "description",
        content:
          "Internal Savvy Swim console for approving, editing and featuring customer reviews shown on the website.",
      },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Reviews Desk · Savvy Swim Admin" },
      { property: "og:description", content: "Approve and edit customer reviews." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type Draft = {
  id?: string;
  rating: number;
  body: string;
  author_name: string;
  author_city: string;
  status: ReviewStatus;
  featured: boolean;
};

const EMPTY: Draft = {
  rating: 5,
  body: "",
  author_name: "",
  author_city: "",
  status: "approved",
  featured: false,
};

function SignIn({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <form
      className="mx-auto mt-24 w-full max-w-sm border border-foreground/15 bg-background p-8"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        setBusy(false);
        if (error) toast.error(error.message);
        else onDone();
      }}
    >
      <h1 className="font-display text-2xl uppercase tracking-[0.08em]">Admin sign in</h1>
      <p className="mt-2 text-sm text-foreground/60">Office and owner accounts only.</p>
      <input
        className="mt-6 w-full border border-foreground/20 bg-transparent px-3 py-2 text-sm"
        type="email"
        autoComplete="email"
        placeholder="you@savvyswim.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <input
        className="mt-3 w-full border border-foreground/20 bg-transparent px-3 py-2 text-sm"
        type="password"
        autoComplete="current-password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      <button
        className="mt-5 w-full bg-[#8E1F2C] px-4 py-2 text-sm uppercase tracking-[0.12em] text-[#F4EFE3] disabled:opacity-60"
        disabled={busy}
        type="submit"
      >
        {busy ? "Checking…" : "Sign in"}
      </button>
    </form>
  );
}

function Editor({
  draft,
  setDraft,
  onSave,
  onCancel,
  busy,
}: {
  draft: Draft;
  setDraft: (d: Draft) => void;
  onSave: () => void;
  onCancel: () => void;
  busy: boolean;
}) {
  return (
    <div className="border border-foreground/15 p-5">
      <div className="flex items-center gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            aria-label={`${n} stars`}
            onClick={() => setDraft({ ...draft, rating: n })}
            className="p-0.5"
          >
            <Star
              className={`h-5 w-5 ${
                n <= draft.rating ? "fill-amber-brand text-amber-brand" : "text-foreground/25"
              }`}
            />
          </button>
        ))}
      </div>

      <textarea
        rows={4}
        value={draft.body}
        onChange={(e) => setDraft({ ...draft, body: e.target.value })}
        placeholder="What the customer said"
        className="mt-3 w-full border border-foreground/20 bg-transparent px-3 py-2 text-sm"
      />

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <input
          value={draft.author_name}
          onChange={(e) => setDraft({ ...draft, author_name: e.target.value })}
          placeholder="Name (e.g. Megan R.)"
          className="w-full border border-foreground/20 bg-transparent px-3 py-2 text-sm"
        />
        <input
          value={draft.author_city}
          onChange={(e) => setDraft({ ...draft, author_city: e.target.value })}
          placeholder="City (e.g. Plano, TX)"
          className="w-full border border-foreground/20 bg-transparent px-3 py-2 text-sm"
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
        <label className="flex items-center gap-2">
          Status
          <select
            value={draft.status}
            onChange={(e) => setDraft({ ...draft, status: e.target.value as ReviewStatus })}
            className="border border-foreground/20 bg-transparent px-2 py-1 text-sm"
          >
            <option value="pending">Waiting</option>
            <option value="approved">Show on site</option>
            <option value="hidden">Hidden</option>
          </select>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={draft.featured}
            onChange={(e) => setDraft({ ...draft, featured: e.target.checked })}
          />
          Pin to the top
        </label>
      </div>

      <div className="mt-4 flex gap-3">
        <button
          type="button"
          onClick={onSave}
          disabled={busy}
          className="bg-[#8E1F2C] px-4 py-2 text-sm uppercase tracking-[0.12em] text-[#F4EFE3] disabled:opacity-60"
        >
          {busy ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="border border-foreground/20 px-4 py-2 text-sm uppercase tracking-[0.12em]"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function ReviewsAdminPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useServerFn(listAllReviews);
  const save = useServerFn(saveReview);
  const remove = useServerFn(deleteReview);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setAuthed(Boolean(data.session)));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) =>
      setAuthed(Boolean(session)),
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  const query = useQuery({
    queryKey: ["admin-site-reviews"],
    queryFn: () => load(),
    enabled: authed === true,
  });

  if (authed === null) return <div className="p-10 text-sm text-foreground/60">Loading…</div>;
  if (!authed) return <SignIn onDone={() => setAuthed(true)} />;

  const rows: AdminReview[] = query.data ?? [];

  async function persist() {
    if (!draft) return;
    setBusy(true);
    try {
      await save({
        data: {
          ...(draft.id ? { id: draft.id } : {}),
          rating: draft.rating,
          body: draft.body.trim(),
          author_name: draft.author_name.trim(),
          author_city: draft.author_city.trim() || null,
          status: draft.status,
          featured: draft.featured,
        },
      });
      setDraft(null);
      await query.refetch();
      toast.success("Saved");
    } catch {
      toast.error("Could not save that review.");
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(row: AdminReview, status: ReviewStatus) {
    await save({
      data: {
        id: row.id,
        rating: row.rating,
        body: row.body,
        author_name: row.author_name,
        author_city: row.author_city,
        status,
        featured: row.featured,
      },
    });
    await query.refetch();
  }

  async function toggleFeatured(row: AdminReview) {
    await save({
      data: {
        id: row.id,
        rating: row.rating,
        body: row.body,
        author_name: row.author_name,
        author_city: row.author_city,
        status: row.status,
        featured: !row.featured,
      },
    });
    await query.refetch();
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-5 py-10">
      <h1 className="font-display text-3xl uppercase tracking-[0.08em]">Reviews</h1>
      <p className="mt-2 text-sm text-foreground/60">
        Only reviews marked “Show on site” appear on the home page.
      </p>

      <div className="mt-6">
        {draft ? (
          <Editor
            draft={draft}
            setDraft={setDraft}
            onSave={persist}
            onCancel={() => setDraft(null)}
            busy={busy}
          />
        ) : (
          <button
            type="button"
            onClick={() => setDraft({ ...EMPTY })}
            className="bg-[#8E1F2C] px-4 py-2 text-sm uppercase tracking-[0.12em] text-[#F4EFE3]"
          >
            Add a review
          </button>
        )}
      </div>

      {query.isLoading && <p className="mt-8 text-sm text-foreground/60">Loading reviews…</p>}
      {query.isError && (
        <p className="mt-8 text-sm text-[#8E1F2C]">
          Could not load reviews. Office or owner sign-in is required.
        </p>
      )}

      <div className="mt-8 space-y-4">
        {rows.map((r) => (
          <article key={r.id} className="border border-foreground/15 p-5">
            <div className="flex flex-wrap items-center gap-3">
              <span className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star
                    key={n}
                    className={`h-4 w-4 ${
                      n <= r.rating ? "fill-amber-brand text-amber-brand" : "text-foreground/20"
                    }`}
                  />
                ))}
              </span>
              <span className="text-sm font-semibold">{r.author_name}</span>
              {r.author_city && (
                <span className="text-sm text-foreground/55">{r.author_city}</span>
              )}
              <span className="px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] bg-foreground/8">
                {r.status === "approved" ? "on site" : r.status === "pending" ? "waiting" : "hidden"}
              </span>
              {r.featured && (
                <span className="px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] bg-[#1FA9BE]/15 text-[#0f6b7a]">
                  pinned
                </span>
              )}
              <span className="ml-auto text-xs text-foreground/45">
                {new Date(r.created_at).toLocaleDateString()}
              </span>
            </div>

            <p className="mt-3 text-sm leading-relaxed">{r.body}</p>
            {r.contact_email && (
              <p className="mt-2 text-xs text-foreground/45">{r.contact_email}</p>
            )}

            <div className="mt-4 flex flex-wrap gap-2 text-xs uppercase tracking-[0.12em]">
              {r.status !== "approved" && (
                <button
                  type="button"
                  onClick={() => void setStatus(r, "approved")}
                  className="border border-foreground/20 px-3 py-1.5"
                >
                  Show on site
                </button>
              )}
              {r.status !== "hidden" && (
                <button
                  type="button"
                  onClick={() => void setStatus(r, "hidden")}
                  className="border border-foreground/20 px-3 py-1.5"
                >
                  Hide
                </button>
              )}
              <button
                type="button"
                onClick={() => void toggleFeatured(r)}
                className="border border-foreground/20 px-3 py-1.5"
              >
                {r.featured ? "Unpin" : "Pin to top"}
              </button>
              <button
                type="button"
                onClick={() =>
                  setDraft({
                    id: r.id,
                    rating: r.rating,
                    body: r.body,
                    author_name: r.author_name,
                    author_city: r.author_city ?? "",
                    status: r.status,
                    featured: r.featured,
                  })
                }
                className="border border-foreground/20 px-3 py-1.5"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!window.confirm("Delete this review?")) return;
                  await remove({ data: { id: r.id } });
                  await query.refetch();
                }}
                className="border border-[#8E1F2C]/40 px-3 py-1.5 text-[#8E1F2C]"
              >
                Delete
              </button>
            </div>
          </article>
        ))}
        {!query.isLoading && rows.length === 0 && (
          <p className="text-sm text-foreground/60">No reviews yet.</p>
        )}
      </div>
    </main>
  );
}
