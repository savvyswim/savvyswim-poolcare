# Instagram profile embed in the footer

Add the official "View this profile on Instagram" card for @hi.savvyswim to the footer, alongside the existing Instagram icon link.

## What you'll see

- In the footer of every page, a compact Instagram profile card showing the SAVVY SWIM account with a "View this profile on Instagram" button.
- The existing Instagram text link/icon stays, with its URL cleaned up to `https://www.instagram.com/hi.savvyswim/`.
- The card only loads Instagram's script after the visitor accepts cookies (matching the existing consent banner behavior), so it doesn't add third-party tracking to every visit. If the script is unavailable or blocked, the card falls back to a simple branded "Follow @hi.savvyswim on Instagram" button — no broken empty box.

## Technical notes

- New `src/components/InstagramProfileEmbed.tsx`: renders Instagram's `<blockquote class="instagram-media">` profile markup, loads `https://www.instagram.com/embed.js` once, and calls `window.instgrm.Embeds.process()` after mount. Uses a fallback link when the script fails or consent is not granted.
- Footers are currently duplicated inline in `src/pages/Index.tsx`, `src/pages/Services.tsx`, `src/pages/PoolCleaningPlano.tsx`, and `src/pages/PoolCleaningFrisco.tsx`. The component gets added to each of these four footers, and each Instagram anchor's href is normalized.
- No design tokens are hardcoded; card wrapper uses existing footer spacing and hairline border styles.
