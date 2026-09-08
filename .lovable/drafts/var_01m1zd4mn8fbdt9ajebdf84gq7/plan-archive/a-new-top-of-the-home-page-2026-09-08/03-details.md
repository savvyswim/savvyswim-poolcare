## Technical notes

**`src/pages/Index.tsx` — the `#who` section only.** Remove the full-bleed background photo, the dark `bg-foreground/45` scrim and the `text-on-media` treatment. Rebuild the section on `bg-background` with a two-column `lg:grid-cols-[minmax(0,1fr)_auto]`: left column holds the wordmark, tagline, rule, promise list and the existing CTA pair; right column holds the three photo tiles (`grid-cols-3`, `aspect-[3/4]`, `object-cover`, `rounded-sm`). Below `lg` the tiles become a horizontal scroll row under the tagline.

- Wordmark: `font-display uppercase text-accent` at `clamp(3.2rem, 12vw, 9rem)` with `leading-[0.82] tracking-[-0.02em]`, "SAVVY" and "SWIM" on separate lines. Keep it as the single `<h1>`, with an `sr-only` full sentence for search engines ("Savvy Swim — pool cleaning and service in DFW") so the visual stack does not cost the heading its meaning.
- Tagline: `font-display uppercase text-accent/70`, then `border-t border-hairline`.
- Promises: a `<ul>` with burgundy bullet dots; text from the four items in the overview.
- CTAs: reuse the existing `goToLead("home_hero")` button and the `PHONE_HREF` / `onCallClick("hero")` link verbatim, restyled for the light background (the outline button uses `border-hairline` instead of `border-primary-foreground/40`).

**Photos:** `IMG_5512_PNG` (umbrella + lifeguard chair), `IMG_5518_PNG` (ring floats) from `@/assets/photos`, and `IMG_5503.jpg.asset.json` (rescue tube) — the same three already used on `/our-work`. Descriptive `alt` text on each; first tile `loading="eager"` `fetchPriority="high"`, the other two lazy.

**City ticker:** new `src/components/CityTicker.tsx` rendering `SERVICE_LOCATIONS` from `@/lib/service-locations` twice inside a flex row, `aria-hidden` on the duplicate, wrapped in `overflow-hidden marquee-fade marquee-pause` and animated with the existing `.animate-marquee-slow` utility in `src/styles.css` (which already stops under `prefers-reduced-motion`). Each name is a `Link` to that city's `href`; slashes are decorative separators. Placed directly above `<main>` in `Index.tsx`, so it appears on the home page only.

**LCP:** the hero image preload in `src/routes/index.tsx` currently points at the pool-water backdrop that this section no longer renders. Repoint it to the first photo tile so the preload still matches the largest element and does not fetch a now-unused file. `localBusinessSchema(photoPoolWater.url)` keeps its current image — that photo stays in use elsewhere.

**Untouched:** the `#offer`, `#how`, `#why` and `#contact` sections, the header, footer, sticky call bar, all analytics hooks, and the head/meta on `src/routes/index.tsx` apart from the preload target.
