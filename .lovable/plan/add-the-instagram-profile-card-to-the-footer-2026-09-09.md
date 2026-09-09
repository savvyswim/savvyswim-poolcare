# Add the Instagram profile card to the footer

Show the official "View this profile on Instagram" card for SAVVY SWIM (@hi.savvyswim) in the footer of every page, above the existing footer links. The small Instagram text link stays.

## What you'll see

- A compact Instagram card in the footer with the account name and a "View this profile on Instagram" button that opens the real profile.
- The card only loads Instagram's code after a visitor answers the cookie bar, so it does not add outside tracking to every visit.
- If Instagram's code is blocked or slow, the card shows a simple branded "Follow @hi.savvyswim on Instagram" button instead of an empty box.
- No change to colors, spacing or the rest of the footer.

## Technical notes

- New `src/components/InstagramProfileEmbed.tsx`: renders the `blockquote.instagram-media` profile markup, injects `https://www.instagram.com/embed.js` once, calls `window.instgrm.Embeds.process()` after mount, and renders the fallback link when consent is missing or the script fails.
- Uses `INSTAGRAM_URL` / `INSTAGRAM_HANDLE` from `src/lib/contact-info.ts`; no hardcoded URLs or colors.
- Mounted once in `SiteFooter` in `src/components/SiteChrome.tsx`, so it appears on all pages that use the shared footer.
- Consent read through the existing helper in `src/lib/consent.ts`, matching the pattern already used for other third-party scripts.
- Verify with a typecheck and a footer check in the preview.
