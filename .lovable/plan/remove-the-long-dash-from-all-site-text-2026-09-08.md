# Remove the long dash from all site text

Goal: the "—" character never appears in anything a visitor reads, and it is never used again in future writing on this project.

## What changes

Every visible sentence that currently uses "—" gets rewritten with normal punctuation: a comma, a period, a colon, or the word "and", whichever reads best. No wording meaning changes.

Places it appears today:
- Home page coverage/business details text
- The local-area paragraph used on the home page, city pages, Plano, Frisco and weekly pool service pages
- The opening hours line ("Closed — Swim Club emergency line" becomes "Closed. Swim Club emergency line only")
- A few internal notes and developer-facing files

## Standing rule

Save a permanent project rule: never use "—" in copy, headings, buttons, emails, alerts, or chat replies for this project. Use a comma, period, colon or "and" instead.

Note: the shorter dash in "Dallas–Fort Worth" is a different character and is the correct spelling of the region, so it stays unless you want that gone too.

## Technical notes

- Sweep `src/`, `public/`, `docs/`, `scripts/` for the em dash and replace with appropriate punctuation per sentence (not a blind find/replace).
- Files touched include `src/components/LocalSeoBlurb.tsx`, `src/components/BusinessInfoCard.tsx`, `src/lib/business-hours.ts`, MCP route files and two docs.
- Add a memory entry recording the ban so future work follows it.
- Verify with a repo-wide search returning zero matches, plus typecheck and tests.
