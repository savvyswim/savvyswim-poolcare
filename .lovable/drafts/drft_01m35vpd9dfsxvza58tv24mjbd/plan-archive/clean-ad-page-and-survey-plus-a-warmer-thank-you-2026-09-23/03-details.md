## Technical notes

- `src/routes/__root.tsx`: add a single `isBareRoute = pathname === "/offer" || pathname === "/survey"` check. Use it to skip `ConsentBanner`, `SwimClubPromptHost` (the current `showOffer` regex already excludes `/offer`, extend it to `/survey`), `WaterTestTab` (already excluded on both) and `QuoteModal`. `CallOptionsCard` stays, since it only opens on a call tap.
- Consent state is untouched: `src/lib/consent.ts` still returns whatever the visitor chose elsewhere, so `MetaPixel` keeps its existing gate and simply stays idle for a visitor whose first and only pages are `/offer` or `/survey`. `PageViewTracker` is first party and keeps recording, so the ads report still sees the traffic.
- `src/pages/ThankYou.tsx`: add a closing block after the `STEPS` list with "We look forward to serving you." and the tagline "On duty, so you don't have to be.", styled with the page's existing burgundy and cream tokens. No em dash.
- No route, schema or lead-flow change.
