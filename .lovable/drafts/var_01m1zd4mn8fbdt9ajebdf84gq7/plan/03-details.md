## What gets built

**Review page (`/leave-a-review`)** — Riviera styling, header and footer like the rest of the site: star picker, comment box, first name, city, optional email (kept private, never shown). On send: a thank-you state plus the "Leave a Google review" button. Also reachable from the existing texted review link page, so that flow now captures the words before handing off to Google.

**Reviews desk (`/admin/reviews`)** — signed-in staff only, hidden from search. A table of every review with stars, text, name, city, date and status. Actions: approve, hide, edit text/name/city/stars, feature (pins it first on the home page), delete, and "Add review" for one you collected by phone.

**Home page** — "Why people go Savvy" reads approved reviews (featured first, then newest, up to six). If none are approved, the current six quotes stay as the fallback so the section never looks empty. The "See our work" link is unchanged.

## Technical notes

- New table `ss_site_reviews`: `id`, `rating` (1–5), `body`, `author_name`, `author_city`, `contact_email`, `status` (`pending` / `approved` / `hidden`), `featured`, `source` (`web` / `staff`), `created_at`, `approved_at`, plus grants, RLS on, an `anon`/`authenticated` SELECT policy limited to `status = 'approved'`, and staff-only write policies via the existing `ss_is_staff()` / `ss_is_office()` helpers. Staged as an additive migration — it takes effect when this draft is accepted.
- Submission goes through a public `createServerFn` in `src/lib/reviews.functions.ts` that validates input with Zod, strips links, rate-limits by IP with the existing `ss_rate_limit_hit`, and always writes `status = 'pending'`.
- Admin reads/writes use a `requireSupabaseAuth` server fn, with the staff role checked in the handler.
- Home page fetches approved reviews in the route loader through a public read (publishable key, approved-only policy) so they are server-rendered for SEO; falls back to the hardcoded list on empty or error.
- Adds `Review`/`AggregateRating` JSON-LD on the home page built from the approved reviews, which is what makes stars eligible in search results.
- `/leave-a-review` gets its own title, description and social tags, and joins the sitemap; `/admin/reviews` is `noindex, nofollow`.
