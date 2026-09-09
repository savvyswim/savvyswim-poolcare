# Make the Instagram link open reliably

## What is happening

The Safari message "Navigation was blocked by Cross-Origin-Opener-Policy" comes from the editor preview window, not from your live site. Checks just run:

- The live site at savvyswim.com sends no cross-origin-opener rule, so the block does not come from your own pages.
- The Instagram address the site uses, instagram.com/hi.savvyswim, loads fine (returns a normal page).

So the profile address is correct, and on the published site the link should open. What is missing is a safety net: when a browser or an embedded preview refuses to open a new tab, the click currently does nothing and looks broken.

## What to change

1. Add one shared "Instagram" link piece used by the header, the Services page, and the Plano and Frisco pages, so all four behave the same.
2. On click, still try to open a new tab. If the browser blocks it (returns nothing), send the visitor to Instagram in the same tab instead, so the click never dies silently.
3. Keep the existing look, label and accessibility wording exactly as they are today. No visual change.

## Technical notes

- New component `src/components/InstagramLink.tsx`: an anchor with `href={INSTAGRAM_URL}`, `target="_blank"`, `rel="noopener noreferrer"`, plus an `onClick` that calls `window.open(...)` and falls back to `window.location.assign(INSTAGRAM_URL)` when the returned handle is null. Accepts a `className` so each surface keeps its current styling.
- Replace the four inline anchors in `src/components/SiteChrome.tsx`, `src/pages/Services.tsx`, `src/pages/PoolCleaningPlano.tsx`, `src/pages/PoolCleaningFrisco.tsx` with it.
- `INSTAGRAM_URL` in `src/lib/contact-info.ts` stays unchanged (verified reachable).
- Verify with a typecheck and a preview click.
