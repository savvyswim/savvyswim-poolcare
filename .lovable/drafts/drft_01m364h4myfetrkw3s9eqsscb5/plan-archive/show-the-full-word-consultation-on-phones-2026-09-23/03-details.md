## Technical detail

- `src/components/SiteChrome.tsx`, header CTA: drop the `sm:hidden` / `hidden sm:inline` split and render a single "Consultation" label. Keep the tap target comfortable with slightly tighter mobile padding and text size (for example `px-3 py-2.5 text-[11px]`, unchanged from `sm:` up).
- Same file: pass the existing call button a variant that hides the number text below `xs` so only the icon shows on the narrowest phones, then restores the number. The `aria-label` keeps the spoken phone number.
- Confirm the header row keeps `shrink-0` on the action cluster and `min-w-0` on the wordmark so nothing overlaps.
- Verify at 320, 360, 390 and 440px: the button reads "Consultation" fully, no horizontal page overflow, and nothing overlaps the wordmark.
