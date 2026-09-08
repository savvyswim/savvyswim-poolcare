## Technical notes

- `src/pages/Services.tsx`: replace the `SERVICES` array (8 card objects) with a flat `SERVICE_MENU` array of 13 strings under a single `POOL CARE` group label.
- Replace the card grid section (currently "The service list", `grid md:grid-cols-2 lg:grid-cols-3` with photo/accordion cards) with a numbered menu list: `01`–`13`, caps `font-display`, hairline divider per row, hover state on the row.
- Each row is a `<button>` calling the existing `openBooking(serviceName)` → `goToLead("services", { service })`, keeping `data-savvy-cta="request_quote"`.
- Remove the now-unused `openCard` state, `ChevronDown`/`CheckCircle2` usage in that section, and the photo imports only used by the cards; keep any photo import still used elsewhere on the page.
- Heading block: `WHAT DO WE OFFER?` in `font-display uppercase`, script/italic sub-line `I thought you'd never ask!` in the serif italic style already used on the site; drop the "Six / Six" counter.
- Leave `Seo`, membership FAQ, process, stats, `ServiceAreaMap`, and the sticky call bar untouched.
- Verify with a type-check and a Playwright pass on `/services`.
