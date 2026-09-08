# Polish every page for phones, and make them load fast

I checked all the main pages at phone width (390px). The good news: nothing spills sideways, so there is no broken layout to rescue. What is left is polish and speed.

Two things stand out today:

- **Photos are far bigger than a phone needs.** On Services, Weekly Pool Service, Our Work and the city pages, full-size images are downloaded and then shrunk to fit a phone screen. That is the single biggest reason a page feels slow on mobile data.
- **One button on the Plano page sits outside its box**, so part of it can be clipped.

## What I'll do

**Make it feel great on a phone**

- Give every page a consistent phone rhythm: comfortable side margins, tighter section spacing, headline sizes that scale down cleanly, and no cramped lines.
- Make every tap target at least a thumb's width (44px) — buttons, phone links, nav links, form fields, star pickers.
- Fix the Plano button that overflows its container.
- Make the home page city ticker stop bleeding past the edge on small screens and pause for people who prefer reduced motion.
- Forms (quote, review, schedule, refer): full-width fields, correct phone/email keyboards on mobile, visible focus, and buttons that don't jump when tapped.
- Tables and wide blocks on the admin pages get horizontal scroll instead of squeezing.
- Respect the notch/home bar so nothing hides behind it.

**Make it load fast**

- Serve phone-sized photos: build small, medium and large versions of each image and let the browser pick, in modern formats. Expect the heaviest pages to drop most of their image weight on mobile.
- Give every image explicit width and height so the page stops jumping while it loads.
- Load only the top-of-page image eagerly; everything below the fold loads as you scroll.
- Load the brand fonts without blocking the first paint, and only the weights actually used.
- Preload the one main image on each page so the biggest thing you see arrives first.
- Trim what runs before the page is interactive, keeping non-essential widgets loading after paint.

**Check the result**

Re-measure every page at phone width before and after, and report the actual numbers (page weight, main-image time, layout shift) rather than claiming it feels faster.

## Technical notes

- Add `vite-imagetools` and convert bundled photo imports to `?w=480;960;1440&format=avif;webp&as=srcset`, rendered through a small `<picture>` helper; keep the existing `-opt.webp` assets as fallback sources.
- Add `width`/`height` (or `aspect-ratio`) on every `<img>` to remove CLS; `loading="lazy"` + `decoding="async"` everywhere except the LCP image, which gets `fetchpriority="high"` and a per-route `head().links` preload.
- Move the Google Fonts stylesheet to a non-blocking load with `font-display: swap` already set; drop unused Archivo weights (currently 300–900 plus italics).
- Audit `container-tight` and section padding in `src/styles.css` for a mobile-first scale; add `min-h-11 min-w-11` to interactive elements in `SiteChrome`, `CallButton`, `LeadForm`, `QuoteModal`, `LeaveReview`, `Schedule`, `Refer`.
- Fix the overflowing anchor in `src/pages/CityLanding.tsx` (wrap + `max-w-full`), and clip/`overflow-hidden` the marquee wrapper in `src/pages/Index.tsx` with a `prefers-reduced-motion` stop.
- Wrap admin tables (`/admin/leads`, `/admin/reviews`, `/admin/pool-map`) in `overflow-x-auto`.
- Verification: Playwright at 390x844 across `/`, `/services`, `/weekly-pool-service`, `/our-work`, `/plano`, `/frisco`, `/leave-a-review`, `/schedule`, `/refer`, `/our-work`, `/privacy`, `/terms`, `/thank-you` — assert `scrollWidth === innerWidth`, no tap target under 44px, transferred image bytes, LCP and CLS from the Performance API.

No content, copy, pricing or backend behavior changes — this is layout, images and loading only.
