## Technical notes

Scope is every em dash (`—`, and the escaped `&mdash;`) that reaches a visitor, in string literals and JSX text. There are roughly 419 dash characters in `src/`; the majority sit in code comments and admin routes and are out of scope.

**In scope**
- `src/pages/*.tsx` except `src/pages/admin*` — Index, Services, WeeklyPoolService, PoolCleaningPlano, PoolCleaningFrisco, CityLanding, OurWork, Schedule, ThankYou, LeaveReview, ReviewLink, SignContract, Privacy, Terms, MovedToApp, NotFound.
- Visitor-facing components: `SiteChrome.tsx`, `CallButton.tsx`, `QuoteModal.tsx`, `LeadForm.tsx`, `AddressAutocomplete.tsx`, `AddressMapPreview.tsx`.
- `head()` titles and descriptions in `src/routes/*.tsx` (leaf content routes only), plus the shared copy in `src/lib/service-locations.ts` and `src/lib/serviceAreas.ts` where those strings render on a page.
- Customer-facing message bodies in the notify helpers: `inspection-notify.server.ts`, `inspection-status-notify.functions.ts`, `reschedule-notify.server.ts`, `appointment-status-notify.server.ts`, `payment-status-notify.server.ts`, `contact-verification.functions.ts`, and the customer-visible strings in `src/routes/api/public/leads.ts`.

**Out of scope**
- Code comments and JSDoc blocks anywhere.
- `src/routes/admin/*`, `src/lib/inventory-alerts.server.ts`, `webhook-watch.ts`, `visit-reminders.ts`, `error-capture.ts` and other staff/internal alert text.
- The en dash in `Dallas–Fort Worth` (`SignContract.tsx`, `structured-data.ts`, city copy) and any en dash inside a numeric range.

**Rewrite rules, applied per string by hand — no blanket find-and-replace**
1. Dash joining two independent clauses becomes a period plus a capitalised next word.
2. Dash introducing a trailing phrase or list becomes a comma.
3. Dash separating a label from its value becomes a colon, or is dropped where the label reads fine without it (`aria-label="Savvy Swim — home"` becomes `"Savvy Swim home"`).
4. Paired dashes around an aside become paired commas (`Privacy.tsx` line 59, `MovedToApp.tsx` line 22).
5. Dash in a `<title>` / `og:title` becomes ` | `, matching the pipe already used in the same titles. Titles must stay under 60 characters, so where the swap pushes past that, the redundant leading segment is trimmed (for example `Pool Cleaning Plano TX | Weekly Service & Repair | Savvy Swim`).
6. A bare `"—"` used as an empty-value placeholder in the signing certificate table becomes an empty string, with the cell rendering blank.
7. `SignContract.tsx` line 407 keeps `Dallas–Fort Worth`; only the `·` separators around it stay too, since those are not dashes.

**Verification**
- `rg -n "—|&mdash;" src/pages src/components src/lib src/routes --glob '!src/routes/admin/**'` returns only comment lines.
- `bunx tsgo --noEmit` clean, `bunx vitest run` green.
- Playwright pass over `/`, `/services`, `/weekly-pool-service`, `/pool-cleaning-plano-tx`, `/schedule`, `/leave-a-review` checking for console errors and screenshotting each, so no sentence reads broken after repunctuation.
